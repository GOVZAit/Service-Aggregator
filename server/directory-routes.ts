import type { Express } from "express";
import {
  cityServiceDirectoryPayloadSchema,
  directoryVisibilitySchema,
  doctorDirectoryPayloadSchema,
  type DirectoryKind,
} from "@shared/directory-schema";
import { authenticatedAdmin, logAdminAction } from "./admin-routes";
import {
  getPublicCityServices,
  getPublicDoctors,
  listCityServices,
  listDoctors,
  nextDirectoryExternalId,
  setDirectoryVisibility,
  upsertDirectoryRecord,
} from "./directory-service";

const doctorPatchSchema = doctorDirectoryPayloadSchema.partial().strict();
const cityServicePatchSchema = cityServiceDirectoryPayloadSchema.partial().strict();

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

async function adminItems(kind: DirectoryKind) {
  return kind === "doctor" ? listDoctors(true) : listCityServices(true);
}

async function currentRecord(kind: DirectoryKind, id: number) {
  const items = await adminItems(kind);
  return items.find((item) => item.id === id)?.record;
}

export async function registerDirectoryRoutes(app: Express) {
  app.get("/api/directory/doctors", async (_req, res) => {
    res.json(await getPublicDoctors());
  });

  app.get("/api/directory/city-services", async (_req, res) => {
    res.json(await getPublicCityServices());
  });

  app.get("/api/admin/directories/doctors", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;
    res.json(await listDoctors(true));
  });

  app.get("/api/admin/directories/city-services", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;
    res.json(await listCityServices(true));
  });

  app.post("/api/admin/directories/doctors", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;

    const parsed = doctorDirectoryPayloadSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

    const id = await nextDirectoryExternalId("doctor");
    await upsertDirectoryRecord("doctor", id, parsed.data);
    await logAdminAction(admin.id, "directory.doctor.create", "doctor", id, {
      name: parsed.data.name,
    });

    const record = await currentRecord("doctor", id);
    res.status(201).json(record);
  });

  app.patch("/api/admin/directories/doctors/:id", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Некорректный id" });

    const existing = await currentRecord("doctor", id);
    if (!existing) return res.status(404).json({ message: "Врач не найден" });

    const patch = doctorPatchSchema.safeParse(req.body);
    if (!patch.success) return res.status(400).json({ message: patch.error.issues[0].message });

    const { id: _existingId, ...existingPayload } = existing;
    const full = doctorDirectoryPayloadSchema.safeParse({ ...existingPayload, ...patch.data });
    if (!full.success) return res.status(400).json({ message: full.error.issues[0].message });

    await upsertDirectoryRecord("doctor", id, patch.data);
    await logAdminAction(admin.id, "directory.doctor.update", "doctor", id, {
      fields: Object.keys(patch.data),
    });

    res.json(await currentRecord("doctor", id));
  });

  app.post("/api/admin/directories/doctors/:id/visibility", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Некорректный id" });
    const parsed = directoryVisibilitySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

    const changed = await setDirectoryVisibility("doctor", id, parsed.data.visible);
    if (!changed) return res.status(404).json({ message: "Врач не найден" });

    await logAdminAction(admin.id, parsed.data.visible ? "directory.doctor.show" : "directory.doctor.hide", "doctor", id);
    res.json({ visible: parsed.data.visible });
  });

  app.post("/api/admin/directories/city-services", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;

    const parsed = cityServiceDirectoryPayloadSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

    const id = await nextDirectoryExternalId("city_service");
    await upsertDirectoryRecord("city_service", id, parsed.data);
    await logAdminAction(admin.id, "directory.city_service.create", "city_service", id, {
      name: parsed.data.name,
      categoryId: parsed.data.categoryId,
    });

    const record = await currentRecord("city_service", id);
    res.status(201).json(record);
  });

  app.patch("/api/admin/directories/city-services/:id", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Некорректный id" });

    const existing = await currentRecord("city_service", id);
    if (!existing) return res.status(404).json({ message: "Контакт не найден" });

    const patch = cityServicePatchSchema.safeParse(req.body);
    if (!patch.success) return res.status(400).json({ message: patch.error.issues[0].message });

    const { id: _existingId, ...existingPayload } = existing;
    const full = cityServiceDirectoryPayloadSchema.safeParse({ ...existingPayload, ...patch.data });
    if (!full.success) return res.status(400).json({ message: full.error.issues[0].message });

    await upsertDirectoryRecord("city_service", id, patch.data);
    await logAdminAction(admin.id, "directory.city_service.update", "city_service", id, {
      fields: Object.keys(patch.data),
    });

    res.json(await currentRecord("city_service", id));
  });

  app.post("/api/admin/directories/city-services/:id/visibility", async (req, res) => {
    const admin = await authenticatedAdmin(req, res);
    if (!admin) return;
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Некорректный id" });
    const parsed = directoryVisibilitySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

    const changed = await setDirectoryVisibility("city_service", id, parsed.data.visible);
    if (!changed) return res.status(404).json({ message: "Контакт не найден" });

    await logAdminAction(admin.id, parsed.data.visible ? "directory.city_service.show" : "directory.city_service.hide", "city_service", id);
    res.json({ visible: parsed.data.visible });
  });
}
