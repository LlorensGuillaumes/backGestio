import { Router } from "express";
import { generatedRouter } from "./generated.js";
import { clientesRouter } from "./rutasPersonalizadas/clientes.routes.js";
import { revisionesRouter } from "./rutasPersonalizadas/revisiones.routes.js";
import { facturasRouter } from "./rutasPersonalizadas/facturas.routes.js";
import { proveedoresRouter } from "./rutasPersonalizadas/proveedores.routes.js";
import { productosRouter } from "./rutasPersonalizadas/productos.routes.js";
import { documentosRouter } from "./rutasPersonalizadas/documentos.routes.js";
import { profesionalesRouter } from "./rutasPersonalizadas/profesionales.routes.js";
import { serviciosRouter } from "./rutasPersonalizadas/servicios.routes.js";
import { modosPagoRouter } from "./rutasPersonalizadas/modosPago.routes.js";
import { stockRouter } from "./rutasPersonalizadas/stock.routes.js";
import { comprasRouter } from "./rutasPersonalizadas/compras.routes.js";
import { empresaRouter } from "./rutasPersonalizadas/empresa.routes.js";
import { cajaRouter } from "./rutasPersonalizadas/caja.routes.js";
import { verifactuRouter } from "./rutasPersonalizadas/verifactu.routes.js";
import { rrhhRouter } from "./rutasPersonalizadas/rrhh.routes.js";
import { controlHorarioRouter } from "./rutasPersonalizadas/controlHorario.routes.js";
import { agendaRouter } from "./rutasPersonalizadas/agenda.routes.js";
import { dashboardRouter } from "./rutasPersonalizadas/dashboard.routes.js";
import { fichajesPublicRouter, fichajesRouter } from "./rutasPersonalizadas/fichajes.routes.js";
import { notificacionesRouter } from "./rutasPersonalizadas/notificaciones.routes.js";
import { chatRouter } from "./rutasPersonalizadas/chat.routes.js";
import { mensajesRouter } from "./rutasPersonalizadas/mensajes.routes.js";
import { departamentosRouter } from "./rutasPersonalizadas/departamentos.routes.js";
import { authRouter } from "./authRoutes.js";
import { userRouter } from "./userRoutes.js";
import { adminRouter } from "./adminRoutes.js";
import { authenticate } from "../middlewares/authenticate.js";

export const apiRouter = Router();

// Rutas de autenticación (primero, algunas son públicas)
apiRouter.use(authRouter);

// Rutas públicas de fichajes (fichar y estado por username, no requieren sesión)
apiRouter.use(fichajesPublicRouter);

// Rutas de administración de usuarios (ya tienen authenticate interno)
apiRouter.use(userRouter);

// Rutas de administración (solo Master, ya tiene authenticate interno)
apiRouter.use(adminRouter);

// =========================================================
// A partir de aquí, todas las rutas requieren autenticación
// =========================================================
apiRouter.use(authenticate);

// Rutas personalizadas (antes del CRUD genérico para tener prioridad)
apiRouter.use(clientesRouter);
apiRouter.use(revisionesRouter);
apiRouter.use(facturasRouter);
apiRouter.use(proveedoresRouter);
apiRouter.use(productosRouter);
apiRouter.use(documentosRouter);
apiRouter.use(profesionalesRouter);
apiRouter.use(serviciosRouter);
apiRouter.use(modosPagoRouter);
apiRouter.use(stockRouter);
apiRouter.use(comprasRouter);
apiRouter.use(empresaRouter);
apiRouter.use(cajaRouter);
apiRouter.use(verifactuRouter);
apiRouter.use(rrhhRouter);
apiRouter.use(controlHorarioRouter);
apiRouter.use(agendaRouter);
apiRouter.use(dashboardRouter);
apiRouter.use(fichajesRouter);
apiRouter.use(notificacionesRouter);
apiRouter.use(chatRouter);
apiRouter.use(mensajesRouter);
apiRouter.use(departamentosRouter);

// Rutas CRUD generadas automáticamente
apiRouter.use(generatedRouter);
