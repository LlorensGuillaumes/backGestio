import { AsyncLocalStorage } from "node:async_hooks";
import type { Knex } from "knex";

// Contexto por petición que guarda la conexión Knex del tenant (empresa) activo.
// El proxy de db.ts lee de aquí para enrutar cada query a la BD correcta.
export const tenantStorage = new AsyncLocalStorage<{ db: Knex }>();
