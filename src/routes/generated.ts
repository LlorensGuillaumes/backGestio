import { Router } from "express";
import { tables } from "./tables.js";
import { createCrudRouter } from "./crudFactory.js";

export const generatedRouter = Router();
for (const t of tables) {
  generatedRouter.use(`/${t.path}`, createCrudRouter(t));
}
