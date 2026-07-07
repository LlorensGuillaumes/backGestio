import knex from "knex";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const db = knex({
    client: "pg",
    connection: {
      host: process.env.DB_HOST ?? "localhost",
      port: Number(process.env.DB_PORT ?? 5432),
      user: process.env.DB_USER ?? "postgres",
      password: process.env.DB_PASSWORD ?? "",
      database: process.env.MASTER_DB_NAME ?? "gestio_master",
    },
  });

  try {
    console.log("Connecting to gestio_master database...");

    // Test connection
    await db.raw("SELECT 1");
    console.log("Connected successfully!");

    // Read SQL file
    const sqlPath = path.join(__dirname, "..", "sql", "comunicacion.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf-8");

    console.log("Executing SQL script...\n");

    // Remove single-line comments and split properly
    const cleanedSql = sqlContent
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n");

    // Split by semicolons but handle multi-line statements
    const statements = cleanedSql
      .split(/;(?=\s*(?:CREATE|INSERT|ALTER|DROP|UPDATE|DELETE|$))/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.raw(statement);
          // Log first line of each statement
          const firstLine = statement.split("\n")[0].trim().substring(0, 70);
          console.log(`  ✓ ${firstLine}${firstLine.length >= 70 ? "..." : ""}`);
        } catch (err: any) {
          // Ignore "already exists" errors for tables, indexes, constraints
          if (
            err.code === "42P07" || // table already exists
            err.code === "23505" || // unique violation (INSERT)
            err.code === "42710" || // object already exists
            err.message?.includes("already exists")
          ) {
            const firstLine = statement.split("\n")[0].trim().substring(0, 50);
            console.log(`  ~ ${firstLine}... (already exists, skipped)`);
          } else {
            console.error(`\nError executing:\n${statement.substring(0, 200)}...\n`);
            throw err;
          }
        }
      }
    }

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

runMigration();
