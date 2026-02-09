import "dotenv/config";
import { app } from "./app.js";
import db from "./db.js";
import { getMasterDb, destroyMasterDb } from "./db/masterDb.js";
import { destroyAllTenantDbs } from "./db/tenantDb.js";
import { initMasterDbTables } from "./db/initMasterDb.js";

const port = Number(process.env.PORT ?? 3001);

async function start() {
  // Test DB principal al arrancar
  await db.raw("select 1 as ok");
  console.log("Conexión a base de datos principal: OK");

  // Test DB master (autenticación) e inicializar tablas
  try {
    const masterDb = getMasterDb();
    await masterDb.raw("select 1 as ok");
    console.log("Conexión a base de datos master: OK");

    // Inicializar tablas si no existen o añadir columnas faltantes
    await initMasterDbTables();
  } catch (error) {
    console.warn("Advertencia: No se pudo conectar a la base de datos master.");
    console.warn("Las funciones de autenticación no estarán disponibles.");
    console.warn("Error:", error);
  }

  const server = app.listen(port, () => {
    console.log(`API lista: http://localhost:${port}/api`);
  });

  const shutdown = async () => {
    console.log("\nCerrando conexiones...");
    server.close(async () => {
      await Promise.all([
        db.destroy(),
        destroyMasterDb(),
        destroyAllTenantDbs(),
      ]);
      console.log("Conexiones cerradas correctamente");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((err) => {
  console.error("Error arrancando:", err);
  process.exit(1);
});
