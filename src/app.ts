// src/app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { apiRouter } from "./routes/index.js";
import { notFound } from "./middlewares/notFound.js";
import { errorHandler } from "./middlewares/errorHandler.js";

export const app = express();

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : ["http://localhost:5173"];

const corsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Database"],
  exposedHeaders: ["X-Database"],
};

app.use(helmet());
app.use(cors(corsOptions));

app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/hola", (_req, res) => {
  console.log("Petición recibida en /health");
  res.send("ok");
});
app.use("/api", apiRouter);

app.use(notFound);
app.use(errorHandler);
