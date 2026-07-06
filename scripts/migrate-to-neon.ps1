# Script para migrar datos locales a Neon
# Ejecutar desde: c:\Users\usuario\Desktop\Web\backRest

# Configuración local
$LOCAL_PORT = "5434"
$LOCAL_USER = "postgres"
$LOCAL_PASSWORD = "fisio1109"

# URLs de Neon (reemplazar con las reales)
$NEON_DB_URL = "postgresql://neondb_owner:npg_i5Ax6JImOjZX@ep-rapid-block-as5jglre.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require"
$NEON_MASTER_URL = "postgresql://neondb_owner:npg_aQ2Deh1jmZRB@ep-young-resonance-as9h6fll-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

Write-Host "=== Migración a Neon ===" -ForegroundColor Yellow
Write-Host ""

# 1. Backup de gestio_db01 (tenant)
Write-Host "1. Creando backup de gestio_db01..." -ForegroundColor Cyan
$env:PGPASSWORD = $LOCAL_PASSWORD
pg_dump -h localhost -p $LOCAL_PORT -U $LOCAL_USER -d gestio_db01 -Fc -f "backup_gestio_db.dump"
if ($LASTEXITCODE -eq 0) {
    Write-Host "   Backup creado: backup_gestio_db.dump" -ForegroundColor Green
} else {
    Write-Host "   Error en backup" -ForegroundColor Red
}

# 2. Backup de gestio_master
Write-Host "2. Creando backup de gestio_master..." -ForegroundColor Cyan
pg_dump -h localhost -p $LOCAL_PORT -U $LOCAL_USER -d gestio_master -Fc -f "backup_gestio_master.dump"
if ($LASTEXITCODE -eq 0) {
    Write-Host "   Backup creado: backup_gestio_master.dump" -ForegroundColor Green
} else {
    Write-Host "   Error en backup" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Para restaurar en Neon ===" -ForegroundColor Yellow
Write-Host "1. Ve a https://console.neon.tech" -ForegroundColor White
Write-Host "2. Selecciona tu base de datos" -ForegroundColor White
Write-Host "3. Ve a 'Query' o usa psql para ejecutar el SQL" -ForegroundColor White
Write-Host ""
Write-Host "O usa estos comandos:" -ForegroundColor White
Write-Host "pg_restore --no-owner --dbname=`"$NEON_DB_URL`" backup_gestio_db.dump" -ForegroundColor Gray
Write-Host "pg_restore --no-owner --dbname=`"$NEON_MASTER_URL`" backup_gestio_master.dump" -ForegroundColor Gray