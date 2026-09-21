import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: ["./shared/schema.ts", "./shared/request-schema.ts", "./shared/order-chat-schema.ts", "./shared/order-review-schema.ts", "./shared/provider-schema.ts", "./shared/push-schema.ts", "./shared/direct-chat-schema.ts"],
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
