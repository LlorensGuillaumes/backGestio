import knex from "knex";
import type { Knex } from "knex";
import "dotenv/config";
import { tenantStorage } from "./db/tenantContext.js";

// Conexión por defecto (fallback). Se usa cuando no hay tenant resuelto en la
// petición (rutas públicas, arranque, scripts). DB_NAME actúa como BD por defecto.
const defaultDb: Knex = knex({
  client: "pg",
  connection: {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? "postgres",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "gestio_db",
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  },
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 600000,
    createTimeoutMillis: 3000,
    destroyTimeoutMillis: 5000,
  },
});

// Devuelve la conexión del tenant activo (si la hay) o la conexión por defecto.
function active(): Knex {
  return tenantStorage.getStore()?.db ?? defaultDb;
}

// Proxy que se comporta como una instancia de Knex pero resuelve dinámicamente
// la conexión del tenant en cada uso. Así los controladores que hacen
// `db("tabla")` o `db.raw(...)` apuntan automáticamente a la BD de la empresa
// seleccionada, sin tener que pasar la conexión manualmente.
const db = new Proxy(function () {} as unknown as Knex, {
  apply(_target, _thisArg, args: unknown[]) {
    return (active() as unknown as (...a: unknown[]) => unknown)(...args);
  },
  get(_target, prop) {
    const inst = active() as unknown as Record<string | symbol, unknown>;
    const value = inst[prop];
    return typeof value === "function" ? (value as Function).bind(inst) : value;
  },
  has(_target, prop) {
    return prop in (active() as unknown as object);
  },
}) as unknown as Knex;

export default db;
export { defaultDb };
