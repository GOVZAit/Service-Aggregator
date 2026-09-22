import { and, desc, eq } from "drizzle-orm";
import { db, pool } from "./db";
import {
  autoPartOffers,
  autoPartRequestRecipients,
  autoPartRequests,
  type AutoPartRequestView,
  type CreateAutoPartRequestInput,
  type SubmitAutoPartOfferInput,
} from "@shared/auto-parts-request-schema";
import { autoPartsSuppliers, type AutoPartsSupplierData } from "@shared/auto-parts-schema";

function effectiveSupplierData(row: typeof autoPartsSuppliers.$inferSelect): AutoPartsSupplierData {
  return {
    ...(row.importedData ?? {}),
    ...(row.manualOverrides ?? {}),
  };
}

function supplierMatchesRequest(
  row: typeof autoPartsSuppliers.$inferSelect,
  input: CreateAutoPartRequestInput,
) {
  if (row.isVisible !== 1) return false;
  const data = effectiveSupplierData(row);
  const type = data.supplierType ?? "store";
  const condition = data.partsCondition ?? "mixed";

  if (input.target === "store" && type !== "store" && type !== "supplier") return false;
  if (input.target === "dismantler" && type !== "dismantler") return false;
  if (input.city && data.city && data.city !== input.city) return false;

  if (input.partCondition === "new" && condition === "used") return false;
  if (input.partCondition === "used" && condition === "new") return false;

  if (input.vehicleType && (data.vehicleTypes?.length ?? 0) > 0 && !data.vehicleTypes!.includes(input.vehicleType)) {
    return false;
  }
  if (input.vehicleOrigin && (data.vehicleOrigins?.length ?? 0) > 0 && !data.vehicleOrigins!.includes(input.vehicleOrigin)) {
    return false;
  }

  const requestedBrand = input.brand.trim().toLocaleLowerCase("ru-RU");
  if (requestedBrand && (data.brands?.length ?? 0) > 0) {
    const matchesBrand = data.brands!.some((brand) =>
      brand.toLocaleLowerCase("ru-RU").includes(requestedBrand) ||
      requestedBrand.includes(brand.toLocaleLowerCase("ru-RU"))
    );
    if (!matchesBrand) return false;
  }

  return true;
}

function serializeRequestRow(row: {
  id: number;
  target: "all" | "store" | "dismantler";
  inventoryPreference: "stock_only" | "stock_or_order" | "order_only";
  partCondition: "any" | "new" | "used";
  city: string;
  vehicleType: "passenger" | "truck" | "van" | "special" | null;
  vehicleOrigin: "foreign" | "domestic" | null;
  brand: string;
  model: string | null;
  year: string | null;
  partName: string;
  oem: string | null;
  notes: string | null;
  status: "open" | "closed";
  createdAt: Date;
}, recipientCount: number, offerCount: number): AutoPartRequestView {
  return {
    id: row.id,
    target: row.target,
    inventoryPreference: row.inventoryPreference,
    partCondition: row.partCondition,
    city: row.city,
    ...(row.vehicleType ? { vehicleType: row.vehicleType } : {}),
    ...(row.vehicleOrigin ? { vehicleOrigin: row.vehicleOrigin } : {}),
    brand: row.brand,
    ...(row.model ? { model: row.model } : {}),
    ...(row.year ? { year: row.year } : {}),
    partName: row.partName,
    ...(row.oem ? { oem: row.oem } : {}),
    ...(row.notes ? { notes: row.notes } : {}),
    status: row.status,
    recipientCount,
    offerCount,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function ensureAutoPartRequestTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auto_part_requests (
      id serial PRIMARY KEY,
      client_user_id integer NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      target text NOT NULL,
      inventory_preference text NOT NULL,
      part_condition text NOT NULL,
      city text NOT NULL,
      vehicle_type text,
      vehicle_origin text,
      brand text NOT NULL,
      model text,
      year text,
      part_name text NOT NULL,
      oem text,
      notes text,
      status text NOT NULL DEFAULT 'open',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS auto_part_requests_client_created_idx
      ON auto_part_requests(client_user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS auto_part_requests_status_created_idx
      ON auto_part_requests(status, created_at DESC);

    CREATE TABLE IF NOT EXISTS auto_part_request_recipients (
      id serial PRIMARY KEY,
      request_id integer NOT NULL REFERENCES auto_part_requests(id) ON DELETE CASCADE,
      supplier_id integer NOT NULL REFERENCES auto_parts_suppliers(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS auto_part_request_recipients_unique
      ON auto_part_request_recipients(request_id, supplier_id);
    CREATE INDEX IF NOT EXISTS auto_part_request_recipients_supplier_idx
      ON auto_part_request_recipients(supplier_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS auto_part_offers (
      id serial PRIMARY KEY,
      request_id integer NOT NULL REFERENCES auto_part_requests(id) ON DELETE CASCADE,
      supplier_id integer NOT NULL REFERENCES auto_parts_suppliers(id) ON DELETE CASCADE,
      availability text NOT NULL,
      condition text,
      price_rub integer,
      eta_text text,
      comment text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS auto_part_offers_request_supplier_unique
      ON auto_part_offers(request_id, supplier_id);
    CREATE INDEX IF NOT EXISTS auto_part_offers_request_idx
      ON auto_part_offers(request_id, updated_at DESC);
  `);
}

export async function createAutoPartRequest(clientUserId: number, input: CreateAutoPartRequestInput) {
  const [request] = await db.insert(autoPartRequests).values({
    clientUserId,
    target: input.target,
    inventoryPreference: input.inventoryPreference,
    partCondition: input.partCondition,
    city: input.city,
    vehicleType: input.vehicleType ?? null,
    vehicleOrigin: input.vehicleOrigin ?? null,
    brand: input.brand,
    model: input.model || null,
    year: input.year || null,
    partName: input.partName,
    oem: input.oem || null,
    notes: input.notes || null,
    status: "open",
  }).returning();

  const suppliers = await db.select().from(autoPartsSuppliers);
  const matched = suppliers.filter((supplier) => supplierMatchesRequest(supplier, input));

  if (matched.length > 0) {
    await db.insert(autoPartRequestRecipients).values(
      matched.map((supplier) => ({ requestId: request.id, supplierId: supplier.id })),
    ).onConflictDoNothing();
  }

  return {
    request: serializeRequestRow(request, matched.length, 0),
    matchedSuppliers: matched.map((supplier) => ({
      supplierId: supplier.id,
      ownerUserId: supplier.ownerUserId,
      name: effectiveSupplierData(supplier).name ?? `Автомагазин #${supplier.id}`,
    })),
  };
}

export async function listClientAutoPartRequests(clientUserId: number) {
  const rows = await db.select().from(autoPartRequests)
    .where(eq(autoPartRequests.clientUserId, clientUserId))
    .orderBy(desc(autoPartRequests.createdAt));

  const result: AutoPartRequestView[] = [];
  for (const row of rows) {
    const recipients = await db.select({ id: autoPartRequestRecipients.id })
      .from(autoPartRequestRecipients)
      .where(eq(autoPartRequestRecipients.requestId, row.id));
    const offers = await db.select({ id: autoPartOffers.id })
      .from(autoPartOffers)
      .where(eq(autoPartOffers.requestId, row.id));
    result.push(serializeRequestRow(row, recipients.length, offers.length));
  }
  return result;
}

export async function getAutoPartRequestForClient(clientUserId: number, requestId: number) {
  const [row] = await db.select().from(autoPartRequests)
    .where(and(eq(autoPartRequests.id, requestId), eq(autoPartRequests.clientUserId, clientUserId)))
    .limit(1);
  if (!row) return undefined;

  const recipients = await db.select({ id: autoPartRequestRecipients.id })
    .from(autoPartRequestRecipients)
    .where(eq(autoPartRequestRecipients.requestId, requestId));

  const offerRows = await pool.query<{
    id: number;
    supplier_id: number;
    supplier_name: string | null;
    supplier_type: "store" | "supplier" | "dismantler" | null;
    availability: "in_stock" | "order" | "unavailable";
    condition: "new" | "used" | null;
    price_rub: number | null;
    eta_text: string | null;
    comment: string | null;
    updated_at: Date;
  }>(`
    SELECT
      o.id,
      o.supplier_id,
      COALESCE(s.manual_overrides->>'name', s.imported_data->>'name') AS supplier_name,
      COALESCE(s.manual_overrides->>'supplierType', s.imported_data->>'supplierType', 'store') AS supplier_type,
      o.availability,
      o.condition,
      o.price_rub,
      o.eta_text,
      o.comment,
      o.updated_at
    FROM auto_part_offers o
    JOIN auto_parts_suppliers s ON s.id = o.supplier_id
    WHERE o.request_id = $1
    ORDER BY
      CASE o.availability WHEN 'in_stock' THEN 0 WHEN 'order' THEN 1 ELSE 2 END,
      o.price_rub ASC NULLS LAST,
      o.updated_at DESC
  `, [requestId]);

  return {
    ...serializeRequestRow(row, recipients.length, offerRows.rows.length),
    offers: offerRows.rows.map((offer) => ({
      id: offer.id,
      supplierId: offer.supplier_id,
      supplierName: offer.supplier_name ?? `Автомагазин #${offer.supplier_id}`,
      supplierType: offer.supplier_type ?? "store",
      availability: offer.availability,
      ...(offer.condition ? { condition: offer.condition } : {}),
      ...(offer.price_rub !== null ? { priceRub: offer.price_rub } : {}),
      ...(offer.eta_text ? { etaText: offer.eta_text } : {}),
      ...(offer.comment ? { comment: offer.comment } : {}),
      updatedAt: offer.updated_at.toISOString(),
    })),
  } satisfies AutoPartRequestView;
}

export async function closeAutoPartRequest(clientUserId: number, requestId: number) {
  const [updated] = await db.update(autoPartRequests).set({
    status: "closed",
    updatedAt: new Date(),
  }).where(and(
    eq(autoPartRequests.id, requestId),
    eq(autoPartRequests.clientUserId, clientUserId),
  )).returning();
  return updated;
}

export async function listStoreAutoPartRequests(ownerUserId: number) {
  const result = await pool.query<{
    request_id: number;
    supplier_id: number;
    supplier_name: string | null;
    target: "all" | "store" | "dismantler";
    inventory_preference: "stock_only" | "stock_or_order" | "order_only";
    part_condition: "any" | "new" | "used";
    city: string;
    vehicle_type: "passenger" | "truck" | "van" | "special" | null;
    vehicle_origin: "foreign" | "domestic" | null;
    brand: string;
    model: string | null;
    year: string | null;
    part_name: string;
    oem: string | null;
    notes: string | null;
    status: "open" | "closed";
    created_at: Date;
    offer_id: number | null;
    availability: "in_stock" | "order" | "unavailable" | null;
    condition: "new" | "used" | null;
    price_rub: number | null;
    eta_text: string | null;
    comment: string | null;
  }>(`
    SELECT
      r.id AS request_id,
      s.id AS supplier_id,
      COALESCE(s.manual_overrides->>'name', s.imported_data->>'name') AS supplier_name,
      r.target,
      r.inventory_preference,
      r.part_condition,
      r.city,
      r.vehicle_type,
      r.vehicle_origin,
      r.brand,
      r.model,
      r.year,
      r.part_name,
      r.oem,
      r.notes,
      r.status,
      r.created_at,
      o.id AS offer_id,
      o.availability,
      o.condition,
      o.price_rub,
      o.eta_text,
      o.comment
    FROM auto_part_request_recipients rr
    JOIN auto_part_requests r ON r.id = rr.request_id
    JOIN auto_parts_suppliers s ON s.id = rr.supplier_id
    LEFT JOIN auto_part_offers o
      ON o.request_id = r.id AND o.supplier_id = s.id
    WHERE s.owner_user_id = $1
    ORDER BY r.status = 'open' DESC, r.created_at DESC
  `, [ownerUserId]);

  return result.rows.map((row) => ({
    requestId: row.request_id,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name ?? `Автомагазин #${row.supplier_id}`,
    target: row.target,
    inventoryPreference: row.inventory_preference,
    partCondition: row.part_condition,
    city: row.city,
    vehicleType: row.vehicle_type,
    vehicleOrigin: row.vehicle_origin,
    brand: row.brand,
    model: row.model,
    year: row.year,
    partName: row.part_name,
    oem: row.oem,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    offer: row.offer_id ? {
      id: row.offer_id,
      availability: row.availability!,
      condition: row.condition,
      priceRub: row.price_rub,
      etaText: row.eta_text,
      comment: row.comment,
    } : null,
  }));
}

export async function submitStoreAutoPartOffer(
  ownerUserId: number,
  requestId: number,
  input: SubmitAutoPartOfferInput,
) {
  const [supplier] = await db.select().from(autoPartsSuppliers)
    .where(and(
      eq(autoPartsSuppliers.id, input.supplierId),
      eq(autoPartsSuppliers.ownerUserId, ownerUserId),
    ))
    .limit(1);
  if (!supplier) return { error: "supplier" as const };

  const [recipient] = await db.select().from(autoPartRequestRecipients)
    .where(and(
      eq(autoPartRequestRecipients.requestId, requestId),
      eq(autoPartRequestRecipients.supplierId, input.supplierId),
    ))
    .limit(1);
  if (!recipient) return { error: "recipient" as const };

  const [request] = await db.select().from(autoPartRequests)
    .where(eq(autoPartRequests.id, requestId))
    .limit(1);
  if (!request || request.status !== "open") return { error: "request" as const };

  const [offer] = await db.insert(autoPartOffers).values({
    requestId,
    supplierId: input.supplierId,
    availability: input.availability,
    condition: input.availability === "unavailable" ? null : (input.condition ?? null),
    priceRub: input.availability === "unavailable" ? null : (input.priceRub ?? null),
    etaText: input.etaText || null,
    comment: input.comment || null,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: [autoPartOffers.requestId, autoPartOffers.supplierId],
    set: {
      availability: input.availability,
      condition: input.availability === "unavailable" ? null : (input.condition ?? null),
      priceRub: input.availability === "unavailable" ? null : (input.priceRub ?? null),
      etaText: input.etaText || null,
      comment: input.comment || null,
      updatedAt: new Date(),
    },
  }).returning();

  return {
    offer,
    clientUserId: request.clientUserId,
    supplierName: effectiveSupplierData(supplier).name ?? `Автомагазин #${supplier.id}`,
  };
}
