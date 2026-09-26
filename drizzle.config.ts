import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
// Direct push is reserved for an interactive, explicitly local development database.
// The deployment helper uses the read-only `npm run db:push` compatibility alias instead.
if (process.argv.includes('push')) {
  const database = new URL(process.env.DATABASE_URL);
  if (process.env.NODE_ENV !== 'development' || !process.stdin.isTTY ||
      !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) || !database.pathname.endsWith('_dev')) {
    throw new Error('Automatic schema push is disabled. Use a reviewed migration; production release never runs push.');
  }
}
export default defineConfig({
  out: './migrations',
  schema: './shared/database-schema.ts',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL },
  strict: true,
});
