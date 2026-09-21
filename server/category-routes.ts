import type { Express } from "express";
import { categoryPayloadSchema } from "@shared/category-schema";
import { authenticatedAdmin, logAdminAction } from "./admin-routes";
import {
  categoryNameExists,
  createCategory,
  getEffectiveCategories,
  getEffectiveCategory,
  updateCategory,
} from "./category-service";

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

export async function registerCategoryRoutes(app: Express) {
  app.get("/api/categories", (_req, res) => {
    res.json(getEffectiveCategories());
  });

  app.get("/api/admin/categories", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;
    res.json(getEffectiveCategories());
  });

  app.post("/api/admin/categories", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;

    const parsed = categoryPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0].message });
    }
    if (await categoryNameExists(parsed.data.name)) {
      return res.status(409).json({ message: "Категория с таким названием уже существует" });
    }

    const category = await createCategory(parsed.data);
    if (!category) return res.status(500).json({ message: "Не удалось создать категорию" });

    await logAdminAction(admin.id, "category.create", "category", category.id, {
      name: category.name,
    });
    res.status(201).json(category);
  });

  app.put("/api/admin/categories/:id", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Некорректный id" });
    const current = getEffectiveCategory(id);
    if (!current) return res.status(404).json({ message: "Категория не найдена" });

    const parsed = categoryPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0].message });
    }
    if (await categoryNameExists(parsed.data.name, id)) {
      return res.status(409).json({ message: "Категория с таким названием уже существует" });
    }

    const category = await updateCategory(id, parsed.data);
    if (!category) return res.status(404).json({ message: "Категория не найдена" });

    await logAdminAction(admin.id, "category.update", "category", id, {
      previousName: current.name,
      name: category.name,
    });
    res.json(category);
  });
}
