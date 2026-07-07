// src/controllers/crudController.ts
import type { Request, Response, NextFunction, RequestHandler } from "express";
import db from "../db.js";
import type { TableConfig } from "../crud/types.js";
import { whereFromParams, stripPkFromBody, getListPaging } from "../crud/helpers.js";
import * as crudService from "../crud/crudService.js";

export function crudHandlers(cfg: TableConfig): {
  list: RequestHandler;
  getOne: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
} {
// src/controllers/crudController.ts
const list: RequestHandler = async (req, res, next) => {
  try {
    const includeInactive = String(req.query.includeInactive ?? "") === "1";

    // ✅ Solo paginar si vienen take/offset en la query
    const takeQ = req.query.take;
    const offsetQ = req.query.offset;

    const take =
      typeof takeQ === "string" && takeQ.trim() !== "" ? Number(takeQ) : undefined;
    const offset =
      typeof offsetQ === "string" && offsetQ.trim() !== "" ? Number(offsetQ) : undefined;

    const { rows, totalCount } = await crudService.list(cfg, {
      take,
      offset,
      includeInactive,
    });

    res.json({ rows, totalCount });
  } catch (e) {
    next(e);
  }
};

  const getOne: RequestHandler = async (req, res, next) => {
    try {
      const pk = whereFromParams(cfg, req.params);
      const row = await crudService.getOne(cfg, pk);
      if (!row) return res.status(404).json({ error: "No encontrado" });
      res.json(row);
    } catch (e) {
      next(e);
    }
  };

  const create: RequestHandler = async (req, res, next) => {
    try {
      console.log('entra a create', req.body)
      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ error: "Body JSON requerido" });
      }
      const [created] = await db(cfg.table).insert(req.body).returning("*");
      res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  };

  const update: RequestHandler = async (req, res, next) => {
    try {
      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ error: "Body JSON requerido" });
      }

      const where = whereFromParams(cfg, req.params);
      const patch = stripPkFromBody(cfg, req.body);

      const [updated] = await db(cfg.table).where(where).update(patch).returning("*");
      if (!updated) return res.status(404).json({ error: "No encontrado" });

      res.json(updated);
    } catch (e) {
      next(e);
    }
  };

  const remove: RequestHandler = async (req, res, next) => {
    try {
      const where = whereFromParams(cfg, req.params);

      if (cfg.deletePolicy.mode === "forbid") {
        return res.status(405).json({
          error: "DELETE no permitido en esta tabla (política no-borrado)",
        });
      }

      if (cfg.deletePolicy.mode === "hard") {
        const count = await db(cfg.table).where(where).del();
        if (!count) return res.status(404).json({ error: "No encontrado" });
        return res.status(204).send();
      }

      if (cfg.deletePolicy.mode === "soft") {
        const patch = {
          [cfg.deletePolicy.field]: cfg.deletePolicy.inactiveValue,
          ...(cfg.deletePolicy.extraOnDelete ?? {}),
        };
        const [updated] = await db(cfg.table).where(where).update(patch).returning("*");
        if (!updated) return res.status(404).json({ error: "No encontrado" });
        return res.json(updated);
      }

      if (cfg.deletePolicy.mode === "state") {
        const patch = {
          [cfg.deletePolicy.field]: cfg.deletePolicy.canceledValue,
          ...(cfg.deletePolicy.extraOnDelete ?? {}),
        };
        const [updated] = await db(cfg.table).where(where).update(patch).returning("*");
        if (!updated) return res.status(404).json({ error: "No encontrado" });
        return res.json(updated);
      }

      return res.status(500).json({ error: "DeletePolicy desconocida" });
    } catch (e) {
      next(e);
    }
  };

  return { list, getOne, create, update, remove };
}
