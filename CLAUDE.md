# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack business management system (Gestión Sistema) with:
- **Backend**: Express 5 + TypeScript + Knex (this repo: `backRest`)
- **Frontend**: React Router 7 + React 19 + TailwindCSS (`../Front/optica-front`)
- **Database**: PostgreSQL with multi-tenant architecture

## Commands

### Backend (backRest)
```bash
npm run dev          # Development server with hot reload (tsx watch)
```

### Frontend (optica-front)
```bash
npm run dev          # Vite dev server on port 5173
npm run build        # Production build
npm run typecheck    # Type checking
```

## Architecture

### Multi-Tenant Database Pattern

Two database types:
- **Master DB** (`gestio_master`): Authentication, users, permissions, sessions, tenant registry
- **Tenant DBs** (e.g., `gestio_db`): Business data per client company

Frontend sends `X-Database` header to specify which tenant. Backend uses `selectDatabase` middleware to route queries.

```typescript
// Master DB - always available
const masterDb = getMasterDb();

// Tenant DB - selected per request
const tenantDb = await getTenantDb(databaseName);
```

### Authentication Flow

1. JWT tokens stored in localStorage with session tracking in `sesiones_activas` table
2. Three roles: `master` (superadmin DaVinci), `admin`, `user`
3. Permission system: menu-based with `ver|crear|editar|eliminar` actions per database
4. Master user ID is string `"master"` (not numeric) - requires special handling in controllers

### API Route Structure

Routes are composed in order of priority in `src/routes/index.ts`:
1. Auth routes (some public)
2. Public fichajes endpoints
3. User/Admin routes with internal auth
4. **`authenticate` middleware** - all routes below require JWT
5. Custom routes (`rutasPersonalizadas/`) - override generic CRUD
6. Auto-generated CRUD routes from `tables.ts` config

### Auto-Generated CRUD

40+ tables configured in `src/routes/tables.ts`. Each config defines:
- Path, table name, primary key
- Delete policy: `soft` (flag field), `hard`, `forbid`, `state`
- Default filters

Factory generates REST endpoints automatically via `crudFactory.ts`.

### Frontend Patterns

- **SSR enabled** (`ssr: true` in react-router.config.ts) - loaders run on server where localStorage unavailable
- Use client-side `useEffect` data fetching for authenticated data, not server loaders
- `AuthContext` provides: `user`, `canAccess(menuCode, action)`, `hasRole()`, `switchDatabase()`
- API client in `lib/api.ts` auto-attaches JWT and `X-Database` header

## Key Files

### Backend
- `src/server.ts` - Entry point
- `src/db/masterDb.ts` - Master DB connection
- `src/db/tenantDb.ts` - Tenant connection pool with caching
- `src/middlewares/authenticate.ts` - JWT verification
- `src/middlewares/authorize.ts` - Permission checking
- `src/routes/tables.ts` - CRUD table configurations
- `sql/` - Database schemas (18 SQL files)

### Frontend
- `app/routes.ts` - Route configuration
- `app/contexts/AuthContext.tsx` - Global auth state
- `app/lib/api.ts` - Axios instance with interceptors
- `app/lib/*Rest.ts` - API integration per domain (30+ files)

## Common Patterns

### Controller Master User Handling
Controllers must check for master user (string "master") before using userId in DB queries:
```typescript
const rawUserId = req.user?.userId;
if (rawUserId === "master" || typeof rawUserId !== "number") {
  return res.json({ data: [] }); // Return empty for master
}
const idUsuario = rawUserId as number;
```

### Knex Query Count with ORDER BY
When cloning queries for count, clear ORDER BY to avoid PostgreSQL errors:
```typescript
const countQuery = query.clone().clearSelect().clearOrder().count("* as total").first();
```

### Soft Delete Pattern
Most tables use `activo` flag for soft deletes:
```typescript
deletePolicy: { mode: "soft", field: "activo", inactiveValue: 0 }
```

## Environment Variables (Backend)

```
PORT=8080
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD
DB_NAME=gestio_db           # Default tenant
MASTER_DB_NAME=gestio_master
JWT_SECRET                  # Min 32 chars
JWT_EXPIRES_IN=24h
MASTER_USERNAME=DaVinci
MASTER_PASSWORD
```

## i18n

Frontend supports Spanish (es) and Catalan (ca) via i18next. Database stores localized menu names in `nombre_es`, `nombre_ca` columns.

## Expert Roles & Workflows

### 🛡️ Cybersecurity Expert (Security Mode)
- **Focus**: SQL Injection en Knex, validación de JWT, y escalada de privilegios entre tenants.
- **Rules**: 
  - Verifica siempre que el middleware `authenticate` y `authorize` esté presente en nuevas rutas.
  - Al usar `req.user.userId`, valida que sea `number` o la cadena `"master"`.
  - Asegura que el header `X-Database` esté sanitizado.

### 🚀 Performance & SQL Expert (DB Mode)
- **Focus**: Optimización de queries Knex y gestión de pools en `tenantDb.ts`.
- **Rules**:
  - Al contar registros, usa siempre `.clearOrder()` para evitar errores de PostgreSQL.
  - Sugiere índices en `sql/` cuando veas filtros frecuentes en `tables.ts`.
  - Evita N+1 en los controladores personalizados.

### 🧪 QA & Testing Expert (Test Mode)
- **Focus**: Cobertura de CRUD y validación de loaders en React Router 7.
- **Rules**:
  - Al crear tests, simula siempre los dos estados: Usuario normal vs Usuario Master.
  - Verifica que los componentes de Frontend manejen estados de carga (loading) y error de API.
