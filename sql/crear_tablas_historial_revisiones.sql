-- =========================
-- HISTORIAL CLÍNICO
-- =========================

-- Historia clínica principal (1:1 con cliente)
CREATE TABLE IF NOT EXISTS "HistoriaClinicaCliente" (
  "IdCliente" INTEGER PRIMARY KEY REFERENCES clientes(id) ON DELETE RESTRICT,
  "NotasGenerales" TEXT,
  "FechaCreacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "FechaUltimaModificacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Antecedentes del cliente
CREATE TABLE IF NOT EXISTS "HC_Antecedentes" (
  "IdAntecedente" SERIAL PRIMARY KEY,
  "IdCliente" INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  "Tipo" VARCHAR(50) DEFAULT 'GENERAL', -- GENERAL, OCULAR, FAMILIAR
  "Descripcion" TEXT,
  "FechaInicio" DATE,
  "FechaFin" DATE,
  "Activo" INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_hc_antecedentes_cliente ON "HC_Antecedentes"("IdCliente");
CREATE INDEX IF NOT EXISTS idx_hc_antecedentes_activo ON "HC_Antecedentes"("Activo");

-- Medicación del cliente
CREATE TABLE IF NOT EXISTS "HC_Medicacion" (
  "IdMedicacion" SERIAL PRIMARY KEY,
  "IdCliente" INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  "Medicamento" VARCHAR(255),
  "Dosis" VARCHAR(100),
  "Frecuencia" VARCHAR(100),
  "FechaInicio" DATE,
  "FechaFin" DATE,
  "Activo" INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_hc_medicacion_cliente ON "HC_Medicacion"("IdCliente");
CREATE INDEX IF NOT EXISTS idx_hc_medicacion_activo ON "HC_Medicacion"("Activo");

-- Alergias del cliente
CREATE TABLE IF NOT EXISTS "HC_Alergias" (
  "IdAlergia" SERIAL PRIMARY KEY,
  "IdCliente" INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  "Sustancia" VARCHAR(255),
  "Reaccion" TEXT,
  "Activo" INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_hc_alergias_cliente ON "HC_Alergias"("IdCliente");
CREATE INDEX IF NOT EXISTS idx_hc_alergias_activo ON "HC_Alergias"("Activo");

-- Hábitos del cliente
CREATE TABLE IF NOT EXISTS "HC_Habitos" (
  "IdCliente" INTEGER PRIMARY KEY REFERENCES clientes(id) ON DELETE RESTRICT,
  "Fumador" INTEGER DEFAULT 0,
  "Observaciones" TEXT
);

-- =========================
-- REVISIONES OPTOMÉTRICAS
-- =========================

-- Revisión principal (cabecera)
CREATE TABLE IF NOT EXISTS "Revisiones" (
  "IdRevision" SERIAL PRIMARY KEY,
  "IdCliente" INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  "FechaRevision" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "MotivoConsulta" TEXT,
  "Sintomas" TEXT,
  "Observaciones" TEXT,
  "Profesional" VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_revisiones_cliente ON "Revisiones"("IdCliente");
CREATE INDEX IF NOT EXISTS idx_revisiones_fecha ON "Revisiones"("FechaRevision");

-- Agudeza Visual
CREATE TABLE IF NOT EXISTS "Rev_AgudezaVisual" (
  "IdRevision" INTEGER PRIMARY KEY REFERENCES "Revisiones"("IdRevision") ON DELETE CASCADE,
  -- Sin corrección
  "OD_Sin" VARCHAR(20),
  "OI_Sin" VARCHAR(20),
  "BIN_Sin" VARCHAR(20),
  -- Con corrección
  "OD_Con" VARCHAR(20),
  "OI_Con" VARCHAR(20),
  "BIN_Con" VARCHAR(20),
  -- Distancia
  "Distancia" VARCHAR(50) -- Lejos, Cerca, Intermedia
);

-- Refracción Objetiva
CREATE TABLE IF NOT EXISTS "Rev_RefraccionObjetiva" (
  "IdRevision" INTEGER PRIMARY KEY REFERENCES "Revisiones"("IdRevision") ON DELETE CASCADE,
  -- Ojo derecho
  "OD_Esf" DECIMAL(5,2),
  "OD_Cil" DECIMAL(5,2),
  "OD_Eje" INTEGER,
  -- Ojo izquierdo
  "OI_Esf" DECIMAL(5,2),
  "OI_Cil" DECIMAL(5,2),
  "OI_Eje" INTEGER,
  -- Método
  "Metodo" VARCHAR(50) -- Autorefractor, Retinoscopia
);

-- Refracción Final (Prescripción)
CREATE TABLE IF NOT EXISTS "Rev_RefraccionFinal" (
  "IdRevision" INTEGER PRIMARY KEY REFERENCES "Revisiones"("IdRevision") ON DELETE CASCADE,
  -- Ojo derecho
  "OD_Esf" DECIMAL(5,2),
  "OD_Cil" DECIMAL(5,2),
  "OD_Eje" INTEGER,
  "OD_ADD" DECIMAL(5,2),
  "OD_Pr" DECIMAL(5,2),
  "OD_Base" VARCHAR(20),
  -- Ojo izquierdo
  "OI_Esf" DECIMAL(5,2),
  "OI_Cil" DECIMAL(5,2),
  "OI_Eje" INTEGER,
  "OI_ADD" DECIMAL(5,2),
  "OI_Pr" DECIMAL(5,2),
  "OI_Base" VARCHAR(20)
);

-- Visión Binocular
CREATE TABLE IF NOT EXISTS "Rev_Binocular" (
  "IdRevision" INTEGER PRIMARY KEY REFERENCES "Revisiones"("IdRevision") ON DELETE CASCADE,
  "CoverTest_Lejos" TEXT,
  "CoverTest_Cerca" TEXT,
  "Convergencia" TEXT,
  "Vergencias" TEXT,
  "Estereopsis" TEXT,
  "DisparidadFijacion" TEXT
);

-- Motilidad y Pupilas
CREATE TABLE IF NOT EXISTS "Rev_MotilidadPupilas" (
  "IdRevision" INTEGER PRIMARY KEY REFERENCES "Revisiones"("IdRevision") ON DELETE CASCADE,
  "Motilidad" TEXT,
  "Pupilas" TEXT
);

-- Salud Ocular
CREATE TABLE IF NOT EXISTS "Rev_SaludOcular" (
  "IdRevision" INTEGER PRIMARY KEY REFERENCES "Revisiones"("IdRevision") ON DELETE CASCADE,
  "Biomicroscopia" TEXT,
  "FondoOjo" TEXT,
  "IOP_OD" DECIMAL(5,2),
  "IOP_OI" DECIMAL(5,2),
  "IOP_Metodo" VARCHAR(100),
  "CampoVisual_Tipo" VARCHAR(100),
  "CampoVisual_Resultado" TEXT
);

-- Queratometría y Topografía
CREATE TABLE IF NOT EXISTS "Rev_QueratometriaTopografia" (
  "IdRevision" INTEGER PRIMARY KEY REFERENCES "Revisiones"("IdRevision") ON DELETE CASCADE,
  -- Ojo derecho
  "OD_K1" DECIMAL(5,2),
  "OD_K2" DECIMAL(5,2),
  "OD_Eje" INTEGER,
  -- Ojo izquierdo
  "OI_K1" DECIMAL(5,2),
  "OI_K2" DECIMAL(5,2),
  "OI_Eje" INTEGER,
  "Notas" TEXT
);

-- =========================
-- RELACIÓN REVISIONES-DOCUMENTOS
-- =========================
CREATE TABLE IF NOT EXISTS "RevisionesDocumentosRel" (
  "IdRevision" INTEGER NOT NULL REFERENCES "Revisiones"("IdRevision") ON DELETE RESTRICT,
  "IdDocumento" INTEGER NOT NULL,
  "TipoRelacion" VARCHAR(50) DEFAULT 'GENERA', -- GENERA, RELACIONADO
  "FechaVinculo" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "Activo" INTEGER DEFAULT 1,
  PRIMARY KEY ("IdRevision", "IdDocumento")
);

-- =========================
-- DATOS DE MONTAJE (ENCARGO)
-- =========================
CREATE TABLE IF NOT EXISTS "EncargoMontaje" (
  "IdEncargoMontaje" SERIAL PRIMARY KEY,
  "IdDocumento" INTEGER NOT NULL,
  "FechaMedicion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "DIP_Lejos" DECIMAL(5,2),
  "DIP_Cerca" DECIMAL(5,2),
  "AlturaPupilar_OD" DECIMAL(5,2),
  "AlturaPupilar_OI" DECIMAL(5,2),
  "AlturaMontaje" DECIMAL(5,2),
  "DistanciaVertice" DECIMAL(5,2),
  "AnguloPantoscopico" DECIMAL(5,2),
  "Inclinacion" DECIMAL(5,2),
  "MonturaModelo" VARCHAR(255),
  "MonturaTalla" VARCHAR(50),
  "Observaciones" TEXT,
  "Activo" INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_encargomontaje_documento ON "EncargoMontaje"("IdDocumento");
