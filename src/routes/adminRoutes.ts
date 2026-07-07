import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireMaster } from '../middlewares/authorize.js';

export const adminRouter = Router();

// Todas las rutas requieren autenticación y rol de Master (aplicado por ruta)
// Gestión de bases de datos
adminRouter.get('/admin/bases-datos', authenticate, requireMaster, adminController.listDatabases);
adminRouter.post('/admin/bases-datos', authenticate, requireMaster, adminController.createDatabase);
adminRouter.put('/admin/bases-datos/:id', authenticate, requireMaster, adminController.updateDatabase);
adminRouter.delete('/admin/bases-datos/:id', authenticate, requireMaster, adminController.deleteDatabase);
adminRouter.get('/admin/bases-datos/:id/usuarios', authenticate, requireMaster, adminController.getDatabaseUsers);

// Asignación de usuarios a bases de datos
adminRouter.post('/admin/usuarios-bases-datos', authenticate, requireMaster, adminController.assignUserToDatabase);
adminRouter.delete('/admin/usuarios-bases-datos', authenticate, requireMaster, adminController.removeUserFromDatabase);

// Listar todos los usuarios
adminRouter.get('/admin/usuarios', authenticate, requireMaster, adminController.listAllUsers);

// Configuración global
adminRouter.get('/admin/configuracion-global', authenticate, requireMaster, adminController.getGlobalConfig);
adminRouter.put('/admin/configuracion-global/:clave', authenticate, requireMaster, adminController.updateGlobalConfig);

// Sincronización y gestión avanzada de bases de datos
adminRouter.post('/admin/bases-datos/sync', authenticate, requireMaster, adminController.syncDatabases);
adminRouter.post('/admin/bases-datos/crear-desde-plantilla', authenticate, requireMaster, adminController.createDatabaseFromTemplate);
adminRouter.get('/admin/postgres-databases', authenticate, requireMaster, adminController.getPostgresDatabases);
adminRouter.delete('/admin/bases-datos/:id/eliminar-completo', authenticate, requireMaster, adminController.deleteDatabaseCompletely);

// Sincronización de esquemas
adminRouter.get('/admin/schemas/analyze', authenticate, requireMaster, adminController.analyzeSchemas);
adminRouter.post('/admin/schemas/sync', authenticate, requireMaster, adminController.syncSchemas);
adminRouter.post('/admin/schemas/apply/:dbName', authenticate, requireMaster, adminController.applySchemasToDatabase);
