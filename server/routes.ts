import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { categories } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/categories", async (_req, res) => {
    res.json(categories);
  });

  app.get("/api/masters", async (req, res) => {
    const { categoryId, search } = req.query;
    
    if (search && typeof search === 'string') {
      const masters = await storage.searchMasters(search);
      return res.json(masters);
    }
    
    if (categoryId) {
      const masters = await storage.getMastersByCategory(Number(categoryId));
      return res.json(masters);
    }
    
    const masters = await storage.getMasters();
    res.json(masters);
  });

  app.get("/api/masters/:id", async (req, res) => {
    const master = await storage.getMasterById(Number(req.params.id));
    if (!master) {
      return res.status(404).json({ error: "Master not found" });
    }
    res.json(master);
  });

  app.get("/api/requests", async (_req, res) => {
    const requests = await storage.getRequests();
    res.json(requests);
  });

  app.get("/api/requests/:id", async (req, res) => {
    const request = await storage.getRequestById(Number(req.params.id));
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }
    res.json(request);
  });

  app.get("/api/orders", async (_req, res) => {
    const orders = await storage.getOrders();
    res.json(orders);
  });

  app.get("/api/orders/:id", async (req, res) => {
    const order = await storage.getOrderById(Number(req.params.id));
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(order);
  });

  app.get("/api/messages/:masterId", async (req, res) => {
    const messages = await storage.getMessages(Number(req.params.masterId));
    res.json(messages);
  });

  app.post("/api/messages/:masterId", async (req, res) => {
    const { text, sender } = req.body;
    if (!text || !sender) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const message = {
      id: Date.now(),
      text,
      sender,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    };
    
    const savedMessage = await storage.addMessage(Number(req.params.masterId), message);
    res.json(savedMessage);
  });

  return httpServer;
}
