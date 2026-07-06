import type { Request } from "express";
import { checkPermission } from "../services/permissionService.js";

// Campos que se consideran "datos bancarios" en cualquiera de sus variantes
// (snake_case de clientes/trabajadores y PascalCase de proveedores/contactos).
const CAMPOS_BANCARIOS = [
  "iban",
  "Iban",
  "titular_cuenta",
  "titularCuenta",
  "TitularCuenta",
  "bic",
  "Bic",
];

// Resuelve el id numérico de la base de datos activa de la request, con el mismo
// criterio que tenantResolver: header X-Database manda sobre el JWT.
function resolveDatabaseId(req: Request): number | null {
  const headerRaw = req.headers["x-database"];
  const headerDb = Array.isArray(headerRaw) ? headerRaw[0] : headerRaw;
  const dbName = String(headerDb || req.user?.currentDatabase || "");
  if (!dbName) return null;
  const match = req.user?.databases?.find((d) => d.dbName === dbName);
  return match?.id ?? null;
}

// ¿El usuario de la request puede VER los datos bancarios indicados por `codigo`
// (p.ej. "clientes.datos_bancarios")? El rol master siempre puede.
export async function puedeVerBancarios(req: Request, codigo: string): Promise<boolean> {
  const u = req.user;
  if (!u) return false;
  if (u.role === "master") return true;
  if (typeof u.userId !== "number") return false;
  const dbId = resolveDatabaseId(req);
  if (!dbId) return false;
  try {
    return await checkPermission(u.userId, dbId, codigo, "ver");
  } catch {
    return false;
  }
}

function ocultarCampos(obj: Record<string, any>, campos: string[]): void {
  for (const c of campos) {
    if (Object.prototype.hasOwnProperty.call(obj, c)) obj[c] = null;
  }
}

// Pone a null los campos bancarios del objeto/array si el usuario NO tiene el
// permiso `codigo`. Defensa en el backend para que el IBAN no viaje en el JSON
// aunque el frontend lo oculte. Devuelve el mismo dato (mutado) por comodidad.
export async function ocultarBancarios<T>(
  req: Request,
  data: T,
  codigo: string,
  campos: string[] = CAMPOS_BANCARIOS
): Promise<T> {
  if (data == null) return data;
  if (await puedeVerBancarios(req, codigo)) return data;

  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === "object") ocultarCampos(item, campos);
    }
  } else if (typeof data === "object") {
    ocultarCampos(data as Record<string, any>, campos);
  }
  return data;
}
