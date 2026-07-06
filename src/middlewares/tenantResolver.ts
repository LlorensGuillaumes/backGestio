import type { Request, Response, NextFunction } from "express";
import { getTenantDb } from "../db/tenantDb.js";
import { tenantStorage } from "../db/tenantContext.js";

// Resuelve la conexión del tenant (empresa) para la petición y la deja en el
// AsyncLocalStorage para que `db` (db.ts) la use durante toda la cadena async.
// Prioriza la BD del JWT (req.user.currentDatabase) y, si no, el header X-Database.
// Si no se resuelve ninguna, se usa la conexión por defecto (no bloquea).
export async function tenantResolver(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // El front indica la empresa activa con el header X-Database (el switch de
    // empresa NO regenera el token, así que el header manda sobre el JWT).
    const headerRaw = req.headers["x-database"];
    const headerDb = Array.isArray(headerRaw) ? headerRaw[0] : headerRaw;
    const tokenDb = req.user?.currentDatabase;
    let dbName = String(headerDb || tokenDb || "");

    // Seguridad: si hay usuario autenticado, solo puede usar una BD a la que
    // tenga acceso (las de su token). Si no, se cae a la BD de su token.
    if (req.user && dbName) {
      const allowed = req.user.databases?.some((d) => d.dbName === dbName);
      if (!allowed) dbName = String(tokenDb || "");
    }

    if (!dbName) {
      next();
      return;
    }

    const tenantDb = await getTenantDb(String(dbName));
    if (!tenantDb) {
      // BD no registrada o inactiva → usa la conexión por defecto.
      next();
      return;
    }

    // Mantiene el contexto durante toda la ejecución async del handler.
    tenantStorage.run({ db: tenantDb }, () => next());
  } catch (error) {
    next(error);
  }
}
