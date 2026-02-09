import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireAdmin } from '../middlewares/authorize.js';

export const userRouter = Router();

// Todas las rutas requieren autenticación y rol de admin (aplicado por ruta)
// CRUD de usuarios
userRouter.get('/usuarios', authenticate, requireAdmin, userController.listUsers);
userRouter.post('/usuarios', authenticate, requireAdmin, userController.createUser);
userRouter.put('/usuarios/:id', authenticate, requireAdmin, userController.updateUser);
userRouter.delete('/usuarios/:id', authenticate, requireAdmin, userController.deleteUser);

// Gestión de permisos
userRouter.get('/usuarios/:id/permisos', authenticate, requireAdmin, userController.getUserPermissions);
userRouter.put('/usuarios/:id/permisos', authenticate, requireAdmin, userController.setUserPermissions);
userRouter.post('/usuarios/:id/reset-password', authenticate, requireAdmin, userController.resetUserPassword);

// Obtener menús disponibles
userRouter.get('/menus', authenticate, requireAdmin, userController.getMenus);

// Obtener bases de datos disponibles (para asignar a usuarios)
userRouter.get('/databases', authenticate, requireAdmin, userController.getAvailableDatabases);
