import type { Express } from "express";
import type { Server } from "http";
import { createHmac, timingSafeEqual } from "node:crypto";
import { WebSocket, WebSocketServer } from "ws";
import { storage } from "./storage";

const REALTIME_PATH = "/ws/realtime";
const TOKEN_PREFIX = "govza-token-";
const TOKEN_TTL_MS = 5 * 60 * 1000;

type RealtimeEvent =
  | { type: "direct-conversation"; conversationId: number }
  | { type: "direct-message"; conversationId: number }
  | { type: "order-message"; orderId: number };

interface TokenPayload {
  userId: number;
  sessionVersion: number;
  expiresAt: number;
}

const socketsByUser = new Map<number, Set<WebSocket>>();
const alive = new WeakMap<WebSocket, boolean>();

function sessionSecret() {
  const value = process.env.SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is required");
  return "govza-dev-secret";
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

function createToken(payload: TokenPayload) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${TOKEN_PREFIX}${encoded}.${sign(encoded)}`;
}

function parseToken(token: string): TokenPayload | undefined {
  if (!token.startsWith(TOKEN_PREFIX)) return undefined;
  const raw = token.slice(TOKEN_PREFIX.length);
  const separator = raw.lastIndexOf(".");
  if (separator <= 0) return undefined;

  const encoded = raw.slice(0, separator);
  const signature = raw.slice(separator + 1);
  const expected = sign(encoded);

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return undefined;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as TokenPayload;
    if (
      !Number.isInteger(payload.userId) ||
      !Number.isInteger(payload.sessionVersion) ||
      !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt <= Date.now()
    ) {
      return undefined;
    }
    return payload;
  } catch {
    return undefined;
  }
}

function protocolsFromHeader(value: string | string[] | undefined) {
  if (!value) return [];
  const header = Array.isArray(value) ? value.join(",") : value;
  return header.split(",").map((item) => item.trim()).filter(Boolean);
}

function attachSocket(userId: number, socket: WebSocket) {
  const sockets = socketsByUser.get(userId) ?? new Set<WebSocket>();
  sockets.add(socket);
  socketsByUser.set(userId, sockets);
  alive.set(socket, true);

  socket.on("pong", () => alive.set(socket, true));
  socket.on("close", () => {
    sockets.delete(socket);
    if (sockets.size === 0) socketsByUser.delete(userId);
  });
  socket.on("error", () => {
    socket.close();
  });

  socket.send(JSON.stringify({ type: "ready" }));
}

export function broadcastRealtimeEvent(userIds: Array<number | undefined>, event: RealtimeEvent) {
  const payload = JSON.stringify(event);
  for (const userId of new Set(userIds.filter((value): value is number => Number.isInteger(value)))) {
    const sockets = socketsByUser.get(userId);
    if (!sockets) continue;
    for (const socket of sockets) {
      if (socket.readyState === WebSocket.OPEN) socket.send(payload);
    }
  }
}

export function registerRealtimeRoutes(app: Express) {
  app.get("/api/realtime-token", async (req, res) => {
    if (!req.session.userId || req.session.sessionVersion === undefined) {
      return res.status(401).json({ message: "Не авторизован" });
    }

    const user = await storage.getUserById(req.session.userId);
    if (!user || user.sessionVersion !== req.session.sessionVersion) {
      return res.status(401).json({ message: "Сессия недействительна" });
    }

    res.setHeader("Cache-Control", "no-store");
    res.json({
      token: createToken({
        userId: user.id,
        sessionVersion: user.sessionVersion,
        expiresAt: Date.now() + TOKEN_TTL_MS,
      }),
    });
  });
}

export function registerRealtimeServer(httpServer: Server) {
  const wss = new WebSocketServer({
    noServer: true,
    handleProtocols(protocols) {
      return protocols.has("govza-realtime") ? "govza-realtime" : false;
    },
  });

  httpServer.on("upgrade", (request, socket, head) => {
    let pathname = "";
    try {
      pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    } catch {
      return;
    }
    if (pathname !== REALTIME_PATH) return;

    const token = protocolsFromHeader(request.headers["sec-websocket-protocol"])
      .find((protocol) => protocol.startsWith(TOKEN_PREFIX));
    const payload = token ? parseToken(token) : undefined;
    if (!payload) {
      socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    void storage.getUserById(payload.userId).then((user) => {
      if (!user || user.sessionVersion !== payload.sessionVersion) {
        socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        attachSocket(user.id, ws);
      });
    }).catch(() => {
      socket.destroy();
    });
  });

  const heartbeat = setInterval(() => {
    wss.clients.forEach((socket) => {
      if (alive.get(socket) === false) {
        socket.terminate();
        return;
      }
      alive.set(socket, false);
      if (socket.readyState === WebSocket.OPEN) socket.ping();
    });
  }, 30_000);
  heartbeat.unref();

  wss.on("close", () => clearInterval(heartbeat));
}
