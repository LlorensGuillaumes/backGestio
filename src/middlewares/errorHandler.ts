import type { Request, Response, NextFunction } from "express";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error("Error handler caught:", err);

  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    // En desarrollo, mostrar detalles del error
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;

    res.status(500).json({
      error: "Internal server error",
      message: errorMessage,
      stack: errorStack
    });
  } else {
    res.status(500).json({ error: "Internal server error" });
  }
}
