-- Agregar campo IdUsuario a la tabla Profesionales (si no existe)
ALTER TABLE "Profesionales" ADD COLUMN IF NOT EXISTS "IdUsuario" INTEGER;

-- Verificar que se agregó correctamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Profesionales' 
AND column_name IN ('IdProfesional', 'NombreCompleto', 'Especialidad', 'NumColegiado', 'IdUsuario', 'Activo');