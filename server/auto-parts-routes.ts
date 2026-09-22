import type { Express, Request } from "express";
import {
  autoPartsSupplierImportSchema,
  autoPartsSupplierPatchSchema,
  manualAutoPartsSupplierCreateSchema,
} from "@shared/auto-parts-schema";
import { authenticatedAdmin, logAdminAction } from "./admin-routes";
import {
  createManualAutoPartsSupplier,
  getAutoPartsSupplierRow,
  importAutoPartsSupplier,
  listAutoPartsSuppliers,
  setAutoPartsSupplierVisibility,
  updateAutoPartsSupplier,
} from "./auto-parts-service";

function validImportKey(req: Request) {
  const configured = process.env.IMPORT_API_KEY;
  if (!configured) return false;
  const raw = req.headers["x-import-key"];
  const supplied = Array.isArray(raw) ? raw[0] : raw;
  return Boolean(supplied && supplied === configured);
}

function includesText(value: string | undefined, query: string) {
  return Boolean(value?.toLocaleLowerCase("ru-RU").includes(query));
}

export async function registerAutoPartsRoutes(app: Express) {
  app.get("/api/auto-parts/suppliers", async (req, res) => {
    const suppliers = await listAutoPartsSuppliers();
    const q = typeof req.query.q === "string" ? req.query.q.trim().toLocaleLowerCase("ru-RU") : "";
    const condition = typeof req.query.condition === "string" ? req.query.condition : "";
    const supplierType = typeof req.query.type === "string" ? req.query.type : "";
    const salesType = typeof req.query.sales === "string" ? req.query.sales : "";
    const city = typeof req.query.city === "string" ? req.query.city.trim() : "";
    const brand = typeof req.query.brand === "string" ? req.query.brand.trim().toLocaleLowerCase("ru-RU") : "";
    const rawVehicleType = typeof req.query.vehicleType === "string" ? req.query.vehicleType : "";
    const rawVehicleOrigin = typeof req.query.vehicleOrigin === "string" ? req.query.vehicleOrigin : "";
    const vehicleType = ["passenger", "truck", "van", "special"].includes(rawVehicleType) ? rawVehicleType : "";
    const vehicleOrigin = ["foreign", "domestic"].includes(rawVehicleOrigin) ? rawVehicleOrigin : "";

    const filtered = suppliers.filter((supplier) => {
      if (condition && supplier.partsCondition !== condition && supplier.partsCondition !== "mixed") return false;
      if (supplierType === "store" && supplier.supplierType !== "store" && supplier.supplierType !== "supplier") return false;
      if (supplierType === "dismantler" && supplier.supplierType !== "dismantler") return false;
      if (supplierType && supplierType !== "store" && supplierType !== "dismantler" && supplier.supplierType !== supplierType) return false;
      if (salesType && supplier.salesType !== salesType && supplier.salesType !== "both") return false;
      if (city && supplier.city !== city) return false;
      if (vehicleType && !(supplier.vehicleTypes as string[]).includes(vehicleType)) return false;
      if (vehicleOrigin && !(supplier.vehicleOrigins as string[]).includes(vehicleOrigin)) return false;
      if (brand && !supplier.brands.some((item) => item.toLocaleLowerCase("ru-RU").includes(brand))) return false;
      if (q) {
        const matches =
          includesText(supplier.name, q) ||
          includesText(supplier.description, q) ||
          includesText(supplier.address, q) ||
          supplier.brands.some((item) => item.toLocaleLowerCase("ru-RU").includes(q)) ||
          supplier.partGroups.some((item) => item.toLocaleLowerCase("ru-RU").includes(q));
        if (!matches) return false;
      }
      return true;
    });

    res.json(filtered);
  });

  app.get("/api/admin/auto-parts/suppliers", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;
    res.json(await listAutoPartsSuppliers(true));
  });

  app.post("/api/admin/auto-parts/suppliers", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;
    const parsed = manualAutoPartsSupplierCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

    const supplier = await createManualAutoPartsSupplier(parsed.data);
    await logAdminAction(admin.id, "auto_parts.create", "auto_parts_supplier", supplier.id, {
      name: supplier.name,
      supplierType: supplier.supplierType,
      partsCondition: supplier.partsCondition,
    });
    res.status(201).json(supplier);
  });

  app.patch("/api/admin/auto-parts/suppliers/:id", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Некорректный id" });

    const parsed = autoPartsSupplierPatchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

    const supplier = await updateAutoPartsSupplier(id, parsed.data);
    if (!supplier) return res.status(404).json({ message: "Запись не найдена" });

    await logAdminAction(admin.id, "auto_parts.update", "auto_parts_supplier", id, {
      fields: Object.keys(parsed.data),
    });
    res.json(supplier);
  });

  app.post("/api/admin/auto-parts/suppliers/:id/visibility", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;
    const id = Number(req.params.id);
    const visible = req.body?.visible;
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Некорректный id" });
    if (typeof visible !== "boolean") return res.status(400).json({ message: "visible должен быть boolean" });
    if (!(await getAutoPartsSupplierRow(id))) return res.status(404).json({ message: "Запись не найдена" });

    const supplier = await setAutoPartsSupplierVisibility(id, visible);
    await logAdminAction(admin.id, visible ? "auto_parts.show" : "auto_parts.hide", "auto_parts_supplier", id);
    res.json(supplier);
  });

  app.post("/api/internal/auto-parts/import", async (req, res) => {
    if (!validImportKey(req)) {
      return res.status(process.env.IMPORT_API_KEY ? 403 : 503).json({ message: "Import API недоступен" });
    }

    const parsed = autoPartsSupplierImportSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

    res.status(201).json(await importAutoPartsSupplier(parsed.data));
  });
}
