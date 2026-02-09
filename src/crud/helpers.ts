import type { TableConfig } from "./types.js";

export function whereFromParams(cfg: TableConfig, params: Record<string, any>) {
  const where: Record<string, any> = {};
  for (const k of cfg.pk) where[k] = params[k];
  return where;
}

export function stripPkFromBody(cfg: TableConfig, body: any) {
  if (!body || typeof body !== "object") return body;
  const copy = { ...body };
  for (const k of cfg.pk) delete copy[k];
  return copy;
}

export function getListPaging(query: any) {
  const limit = query.limit ? Math.min(Number(query.limit), 500) : 100;
  const offset = query.offset ? Math.max(Number(query.offset), 0) : 0;
  return { limit, offset };
}
