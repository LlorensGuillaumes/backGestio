import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middlewares/authenticate.js';

export const authRouter = Router();

// Rutas públicas
authRouter.post('/auth/login', authController.login);

// Rutas protegidas
authRouter.post('/auth/logout', authenticate, authController.logout);
authRouter.get('/auth/me', authenticate, authController.me);
authRouter.post('/auth/switch-database', authenticate, authController.switchDatabase);
authRouter.put('/auth/change-password', authenticate, authController.changePassword);
authRouter.get('/auth/sessions', authenticate, authController.getSessions);
authRouter.post('/auth/revoke-sessions', authenticate, authController.revokeAllSessions);
