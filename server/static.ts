import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath, {
    setHeaders(res, filePath) {
      const relativePath = path.relative(distPath, filePath).split(path.sep).join("/");

      if (relativePath.startsWith("assets/")) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (["index.html", "sw.js", "manifest.webmanifest"].includes(relativePath)) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  }));

  // Missing files must stay missing. Returning index.html for an old hashed JS/CSS
  // asset turns a clean 404 into a module MIME/parse failure after a deployment.
  app.use((req, res, next) => {
    if (path.extname(req.path)) {
      return res.status(404).end();
    }
    next();
  });

  // Fall through to index.html only for client-side application routes.
  app.use("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
