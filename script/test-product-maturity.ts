import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { activeFilterEntries, applyMasterFilters, defaultCatalogState, defaultFilterState, masterPrice, normalizeSearch, priceValue, readCatalogState, searchMasters, sortMasters, writeCatalogState } from "../shared/catalog";
import { canRequestSlot, formatBookingSlot, isAvailableToday, isCalendarDate, isFutureSlot, parseBookingSlot, serviceNow, upcomingDates } from "../shared/service-time";
import { availabilityDaySchema } from "../shared/provider-engagement-schema";
import type { Master } from "../shared/schema";

let cases = 0;
function test(name: string, action: () => void) { action(); cases++; console.log(`✓ ${name}`); }
const master = (id: number, patch: Partial<Master> = {}): Master => ({
  id, name: "Умар Тестовый", category: "Сантехника", categoryId: 1, rating: 4.8, reviews: 12, price: "от 1 500 ₽",
  avatar: "", verified: true, distance: "1,2 км", responseTime: "", completedOrders: 40, description: "Замена и ремонт труб",
  portfolio: [], services: [{ name: "Установка смесителя", price: "1 500 ₽" }], callMode: "disabled", workingHours: { from: "09:00", to: "18:00" },
  isOnline: false, city: "Грозный", district: "Центр", providerType: "master", executorType: "self_employed", ...patch,
});
const people = [master(1), master(2, { category: "Уборка", categoryId: 2, name: "Студия Чистоты", companyName: "Чистый дом", services: [{ name: "Мытьё окон", price: "600 ₽" }], price: "600 ₽", district: "Север", isOnline: true }), master(3, { price: "По договорённости", reviews: 0, rating: 5, verified: false })];
const ids = (rows: Master[]) => rows.map((row) => row.id);
const now = new Date("2026-09-23T09:00:00Z"); // Noon in the service region.
const window = { date: "2026-09-23", status: "available", fromTime: "09:00", toTime: "18:00" };

for (const [input, expected] of [["от 1 500 ₽", 1500], ["1\u00a0500 ₽", 1500], ["1\u202f500 ₽", 1500], ["500,50 ₽", 500.5], ["12 500 000 ₽", 12500000], ["По договорённости", null], ["Бесплатно", null], ["0 ₽", 0]] as const) {
  test(`price: ${input}`, () => assert.equal(priceValue(input), expected));
}
test("hidden price is unknown", () => assert.equal(masterPrice(master(1, { showPrices: false })), null));
test("normalize ё, case, punctuation and repeated spaces", () => assert.equal(normalizeSearch("  МЫТЬЁ,  окон! "), "мытье окон"));
test("search service name", () => assert.deepEqual(ids(searchMasters(people, "смесителя")), [1, 3]));
test("search company", () => assert.deepEqual(ids(searchMasters(people, "Чистый дом")), [2]));
test("search ё/е", () => assert.deepEqual(ids(searchMasters(people, "мытье окон")), [2]));
test("search one typo", () => assert.deepEqual(ids(searchMasters(people, "сантехнк")), [1, 3]));
test("search transposed letters", () => assert.equal(searchMasters([people[0]], "сантехинка").length, 1));
test("search synonyms", () => assert.deepEqual(ids(searchMasters(people, "клининг")), [2]));
test("search city and service with AND", () => assert.equal(searchMasters([people[0]], "Грозный смесителя").length, 1));
test("unmatched word must not be dropped", () => assert.equal(searchMasters(people, "смесителя гитара").length, 0));
test("empty search stable", () => assert.deepEqual(ids(searchMasters(people, "  ")), [1, 2, 3]));
test("exact service ranks above typo", () => assert.deepEqual(ids(searchMasters([master(1, { services: [{ name: "Сместеля", price: "1" }], rating: 5 }), master(2)], "смесителя")), [2, 1]));
test("input lists are immutable", () => { searchMasters(people, "сантехника"); sortMasters(people, "price_asc"); assert.deepEqual(ids(people), [1, 2, 3]); });
test("minimum price parses thousands", () => assert.deepEqual(ids(applyMasterFilters(people, { ...defaultFilterState, minPrice: 1000 })), [1]));
test("price range inclusive", () => assert.deepEqual(ids(applyMasterFilters(people, { ...defaultFilterState, minPrice: 1500, maxPrice: 1500 })), [1]));
test("invalid price range has no results", () => assert.equal(applyMasterFilters(people, { ...defaultFilterState, minPrice: 2000, maxPrice: 1000 }).length, 0));
test("unknown price last ascending", () => assert.deepEqual(ids(sortMasters(people, "price_asc")), [2, 1, 3]));
test("unknown price last descending", () => assert.deepEqual(ids(sortMasters(people, "price_desc")), [1, 2, 3]));
test("meters and decimal kilometres", () => assert.deepEqual(ids(sortMasters([master(1), master(2, { distance: "700 м" }), master(3, { distance: "Неизвестно" })], "distance")), [2, 1, 3]));
test("no invented review rating", () => assert.deepEqual(ids(applyMasterFilters(people, { ...defaultFilterState, minRating: 4.5 })), [1, 2]));
test("no review rating sorted below verified feedback", () => assert.deepEqual(ids(sortMasters(people, "rating")), [1, 2, 3]));
test("availability independent of online", () => assert.deepEqual(ids(applyMasterFilters(people, { ...defaultFilterState, availableTodayOnly: true }, new Set([1]))), [1]));
test("unknown availability never available", () => assert.equal(applyMasterFilters(people, { ...defaultFilterState, availableTodayOnly: true }).length, 0));
test("combined district, trust and review filters", () => assert.deepEqual(ids(applyMasterFilters(people, { ...defaultFilterState, district: "Центр", verifiedOnly: true, minReviews: 10 })), [1]));
test("organization and certification filters", () => assert.deepEqual(ids(applyMasterFilters([master(1, { providerType: "organization", hasCertificate: true }), master(2)], { ...defaultFilterState, providerType: "organization", certifiedOnly: true })), [1]));
test("URL round trip", () => {
  const state = { ...defaultCatalogState, query: "ремонт окон", city: "Грозный", category: 2, view: "map" as const, filters: { ...defaultFilterState, minPrice: 0, maxPrice: 2000, availableTodayOnly: true, minRating: 4.5, sortBy: "price_desc" as const } };
  assert.deepEqual(readCatalogState(new URLSearchParams(writeCatalogState(state))), state);
});
test("defaults create empty URL", () => assert.equal(writeCatalogState(defaultCatalogState), ""));
test("malformed URL is bounded", () => {
  const state = readCatalogState(new URLSearchParams(`minRating=999&minPrice=-1&sortBy=hack&category=NaN&q=${"x".repeat(500)}`));
  assert.equal(state.filters.minRating, 0); assert.equal(state.filters.minPrice, null); assert.equal(state.filters.sortBy, "relevance"); assert.equal(state.category, null); assert.equal(state.query.length, 120);
});
test("active chips count each criterion, not sort", () => assert.equal(activeFilterEntries({ ...defaultFilterState, minPrice: 0, verifiedOnly: true, sortBy: "reviews" }).length, 2));
test("service timezone at midnight", () => assert.deepEqual(serviceNow(new Date("2026-09-23T21:30:00Z")), { date: "2026-09-24", time: "00:30" }));
test("upcoming dates cross month/year", () => assert.deepEqual(upcomingDates(3, new Date("2026-12-31T20:30:00Z")), ["2026-12-31", "2027-01-01", "2027-01-02"]));
for (const date of ["2026-02-29", "2026-02-30", "2026-13-01", "2026-00-01", "bad"]) test(`reject impossible date ${date}`, () => assert.equal(isCalendarDate(date), false));
test("valid leap day", () => assert.equal(isCalendarDate("2028-02-29"), true));
test("available window", () => assert.equal(isAvailableToday(window, now), true));
test("future window today included", () => assert.equal(isAvailableToday({ ...window, fromTime: "15:00" }, now), true));
test("expired window disappears exactly at end", () => assert.equal(isAvailableToday({ ...window, toTime: "12:00" }, now), false));
test("busy is not free", () => assert.equal(isAvailableToday({ ...window, status: "busy" }, now), false));
test("yesterday is not today", () => assert.equal(isAvailableToday({ ...window, date: "2026-09-22" }, now), false));
test("missing or reversed times not free", () => { assert.equal(isAvailableToday({ ...window, toTime: undefined }, now), false); assert.equal(isAvailableToday({ ...window, toTime: "08:00" }, now), false); });
test("booking date round trip", () => assert.deepEqual(parseBookingSlot(formatBookingSlot("2026-10-04", "15:30")), { date: "2026-10-04", time: "15:30" }));
test("reject rolled booking date", () => assert.equal(parseBookingSlot("31.02.2026, 09:00"), undefined));
test("reject time rollover", () => assert.equal(parseBookingSlot("23.09.2026, 24:00"), undefined));
test("reject current/past minute", () => { assert.equal(isFutureSlot("2026-09-23", "12:00", now), false); assert.equal(isFutureSlot("2026-09-23", "11:59", now), false); });
test("future request time", () => assert.equal(isFutureSlot("2026-09-23", "12:01", now), true));
test("unknown schedule allows request, not a free badge", () => { assert.equal(canRequestSlot(undefined, "2026-09-24", "15:00"), true); assert.equal(isAvailableToday(undefined, now), false); });
test("booking window bounds", () => { assert.equal(canRequestSlot(window, window.date, "09:00"), true); assert.equal(canRequestSlot(window, window.date, "18:00"), false); assert.equal(canRequestSlot(window, window.date, "08:30"), false); });
test("busy and off reject requests", () => { for (const status of ["busy", "off"]) assert.equal(canRequestSlot({ ...window, status }, window.date, "15:00"), false); });
test("API availability rejects impossible dates", () => assert.equal(availabilityDaySchema.safeParse({ ...window, date: "2026-02-30" }).success, false));
test("API availability rejects inverted window", () => assert.equal(availabilityDaySchema.safeParse({ ...window, fromTime: "20:00" }).success, false));
test("static me availability route precedes dynamic provider id", () => {
  const source = readFileSync("server/provider-engagement-routes.ts", "utf8");
  assert.ok(source.indexOf('app.get("/api/providers/me/availability"') < source.indexOf('app.get("/api/providers/:id/availability"'));
});
console.log(`\n${cases} product regression checks passed.`);
