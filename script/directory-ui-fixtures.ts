/** UI acceptance data only. Never imported by the application or written to its database. */
import { writeFileSync } from "node:fs";
import { mastersData } from "../client/src/lib/data";
import { doctors } from "../client/src/lib/doctors-data";
import { categories } from "../shared/schema";
import { curatedChechnyaAutoPartsSeeds } from "../server/auto-parts-curated-data";
const output = process.env.UI_FIXTURES;
if (!output) throw new Error("UI_FIXTURES must point to a temporary JSON file");
writeFileSync(output, JSON.stringify({
  masters: mastersData.map((master) => ({ ...master, city: "Грозный", district: "", callMode: "always", workingHours: { from: "09:00", to: "18:00" }, isOnline: false, categoryIds: [master.categoryId] })),
  doctors, categories,
  suppliers: curatedChechnyaAutoPartsSeeds.map((entry, index) => ({ id: index + 1, ...entry.data })),
}));
