import type { Express } from "express";
import { z } from "zod";
import { authenticatedAdmin, logAdminAction } from "./admin-routes";
import {
  getProviderImportConfiguration,
  listProviderImportRuns,
  reloadProviderImportSources,
  runConfiguredProviderImports,
} from "./provider-importer";

const runImportSchema = z.object({
  sourceName: z.string().trim().min(2).max(80).optional(),
}).strict();

export async function registerProviderImportRoutes(app: Express) {
  app.get("/api/admin/import/config", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;
    res.json(getProviderImportConfiguration());
  });

  app.get("/api/admin/import/runs", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;
    const requested = Number(req.query.limit);
    res.json(await listProviderImportRuns(Number.isFinite(requested) ? requested : 50));
  });

  app.post("/api/admin/import/reload", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;

    reloadProviderImportSources();
    const configuration = getProviderImportConfiguration();
    await logAdminAction(admin.id, "import.reload_config", "import", "config", {
      sourceCount: configuration.sources.length,
      valid: !configuration.configurationError,
    });
    res.json(configuration);
  });

  app.post("/api/admin/import/run", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;

    const parsed = runImportSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0].message });
    }

    const configuration = getProviderImportConfiguration();
    if (configuration.configurationError) {
      return res.status(503).json({
        message: `Ошибка конфигурации импорта: ${configuration.configurationError}`,
      });
    }
    if (configuration.sources.length === 0) {
      return res.status(503).json({
        message: "Источники импорта не настроены",
      });
    }

    try {
      const results = await runConfiguredProviderImports("admin", parsed.data.sourceName);
      await logAdminAction(admin.id, "import.run", "import", parsed.data.sourceName ?? "all", {
        results: results.map((result) => ({
          sourceName: result.sourceName,
          status: result.status,
          imported: result.imported,
          skipped: result.skipped,
        })),
      });
      res.json({ results });
    } catch (error) {
      res.status(409).json({
        message: error instanceof Error ? error.message : "Не удалось запустить импорт",
      });
    }
  });
}
