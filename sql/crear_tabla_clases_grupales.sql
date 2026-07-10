-- Tabla para clases grupales de la escuela de música
CREATE TABLE IF NOT EXISTS "ClasesGrupales" (
  "IdClaseGrupal" SERIAL PRIMARY KEY,
  "Nombre" VARCHAR(255) NOT NULL,
  "IdProfesor" INTEGER NOT NULL REFERENCES "Profesionales"("IdProfesional"),
  "IdInstrumento" INTEGER NOT NULL REFERENCES "Servicios"("IdServicio"),
  "CapacidadMaxima" INTEGER NOT NULL DEFAULT 1,
  "DiaDeLaSemana" INTEGER NOT NULL, -- 1=Lunes, 2=Martes, ..., 7=Domingo
  "HoraInicio" TIME NOT NULL,
  "HoraFin" TIME NOT NULL,
  "Aula" VARCHAR(100),
  "FechaInicio" DATE,
  "FechaFin" DATE,
  "Activa" BOOLEAN NOT NULL DEFAULT true,
  "FechaCreacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "FechaModificacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS "idx_clases_grupales_profesor" ON "ClasesGrupales"("IdProfesor");
CREATE INDEX IF NOT EXISTS "idx_clases_grupales_instrumento" ON "ClasesGrupales"("IdInstrumento");
CREATE INDEX IF NOT EXISTS "idx_clases_grupales_dia" ON "ClasesGrupales"("DiaDeLaSemana");
CREATE INDEX IF NOT EXISTS "idx_clases_grupales_activa" ON "ClasesGrupales"("Activa");