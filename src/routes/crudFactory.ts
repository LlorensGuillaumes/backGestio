import { Router } from "express";
import type { TableConfig } from "../crud/types.js";
import { crudHandlers } from "../controllers/crudController.js";

export function createCrudRouter(cfg: TableConfig) {
  const r = Router();
  const h = crudHandlers(cfg);

  const pkRoute = cfg.pk.map((k) => `/:${k}`).join("");

  r.get("/", h.list);
  r.get(pkRoute, h.getOne);
  r.post("/", h.create);
  r.put(pkRoute, h.update);
  r.delete(pkRoute, h.remove);

  return r;
}
