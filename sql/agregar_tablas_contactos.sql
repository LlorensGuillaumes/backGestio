-- Agregar tablas Contactos y AlumnoResponsables (si no existen)
CREATE TABLE IF NOT EXISTS "Contactos" (
    "IdContacto" SERIAL PRIMARY KEY,
    "Nombre" VARCHAR(100) NOT NULL,
    "Apellido1" VARCHAR(100),
    "Apellido2" VARCHAR(100),
    "Dni" VARCHAR(20),
    "Telefono" VARCHAR(30),
    "Email" VARCHAR(200),
    "Direccion" VARCHAR(300),
    "CodigoPostal" VARCHAR(10),
    "Poblacion" VARCHAR(100),
    "Provincia" VARCHAR(100),
    "Iban" VARCHAR(50),
    "TitularCuenta" VARCHAR(200),
    "Bic" VARCHAR(20),
    "Observaciones" TEXT,
    "Activo" SMALLINT DEFAULT 1,
    "FechaCreacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "FechaModificacion" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AlumnoResponsables" (
    "IdAlumnoResponsable" SERIAL PRIMARY KEY,
    "IdCliente" INT NOT NULL REFERENCES "clientes"("id") ON DELETE CASCADE,
    "IdContacto" INT NOT NULL REFERENCES "Contactos"("IdContacto") ON DELETE CASCADE,
    "Parentesco" VARCHAR(50),
    "EsPagador" BOOLEAN DEFAULT FALSE,
    "EsPrincipal" BOOLEAN DEFAULT FALSE,
    "Activo" SMALLINT DEFAULT 1,
    "FechaCreacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "FechaModificacion" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_contactos_activo" ON "Contactos"("Activo");
CREATE INDEX IF NOT EXISTS "idx_alumno_responsables_cliente" ON "AlumnoResponsables"("IdCliente");
CREATE INDEX IF NOT EXISTS "idx_alumno_responsables_contacto" ON "AlumnoResponsables"("IdContacto");

-- Verificar que se crearon correctamente
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('Contactos', 'AlumnoResponsables');