// src/controllers/controllersPersonalizados/departamentos.controller.ts
import type { Request, Response, NextFunction } from "express";
import * as departamentosService from "../../services/departamentos.service.js";

/**
 * GET /departamentos
 * Lista todos los departamentos
 */
export async function getDepartamentos(req: Request, res: Response, next: NextFunction) {
  try {
    const soloActivos = req.query.activos !== "0" && req.query.activos !== "false";
    const departamentos = await departamentosService.getDepartamentos(soloActivos);

    res.json({ data: departamentos });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /departamentos/:id
 * Obtiene un departamento por ID
 */
export async function getDepartamento(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "ID de departamento inválido" });
    }

    const departamento = await departamentosService.getDepartamento(id);

    if (!departamento) {
      return res.status(404).json({ error: "Departamento no encontrado" });
    }

    res.json({ data: departamento });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /departamentos
 * Crea un nuevo departamento
 */
export async function crearDepartamento(req: Request, res: Response, next: NextFunction) {
  try {
    const { nombre, descripcion } = req.body;

    if (!nombre || typeof nombre !== "string" || nombre.trim().length === 0) {
      return res.status(400).json({ error: "El nombre es requerido" });
    }

    const departamento = await departamentosService.crearDepartamento(
      nombre.trim(),
      descripcion?.trim()
    );

    res.status(201).json({ data: departamento });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /departamentos/:id
 * Actualiza un departamento
 */
export async function actualizarDepartamento(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "ID de departamento inválido" });
    }

    const { nombre, descripcion, activo } = req.body;

    const actualizado = await departamentosService.actualizarDepartamento(id, {
      nombre: nombre?.trim(),
      descripcion: descripcion?.trim(),
      activo,
    });

    if (!actualizado) {
      return res.status(404).json({ error: "Departamento no encontrado" });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /departamentos/:id
 * Elimina (desactiva) un departamento
 */
export async function eliminarDepartamento(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "ID de departamento inválido" });
    }

    const eliminado = await departamentosService.eliminarDepartamento(id);

    if (!eliminado) {
      return res.status(404).json({ error: "Departamento no encontrado" });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /departamentos/:id/usuarios
 * Obtiene los usuarios de un departamento
 */
export async function getUsuariosDepartamento(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "ID de departamento inválido" });
    }

    const usuarios = await departamentosService.getUsuariosDepartamento(id);

    res.json({ data: usuarios });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /departamentos/:id/usuarios
 * Asigna usuarios a un departamento
 */
export async function asignarUsuarios(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "ID de departamento inválido" });
    }

    const { idUsuarios } = req.body;

    if (!Array.isArray(idUsuarios)) {
      return res.status(400).json({ error: "idUsuarios debe ser un array" });
    }

    await departamentosService.asignarUsuarios(id, idUsuarios);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /departamentos/:id/usuarios/:idUsuario
 * Agrega un usuario a un departamento
 */
export async function agregarUsuario(req: Request, res: Response, next: NextFunction) {
  try {
    const idDepartamento = Number(req.params.id);
    const idUsuario = Number(req.params.idUsuario);

    if (!Number.isFinite(idDepartamento) || idDepartamento <= 0) {
      return res.status(400).json({ error: "ID de departamento inválido" });
    }
    if (!Number.isFinite(idUsuario) || idUsuario <= 0) {
      return res.status(400).json({ error: "ID de usuario inválido" });
    }

    await departamentosService.agregarUsuario(idDepartamento, idUsuario);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /departamentos/:id/usuarios/:idUsuario
 * Quita un usuario de un departamento
 */
export async function quitarUsuario(req: Request, res: Response, next: NextFunction) {
  try {
    const idDepartamento = Number(req.params.id);
    const idUsuario = Number(req.params.idUsuario);

    if (!Number.isFinite(idDepartamento) || idDepartamento <= 0) {
      return res.status(400).json({ error: "ID de departamento inválido" });
    }
    if (!Number.isFinite(idUsuario) || idUsuario <= 0) {
      return res.status(400).json({ error: "ID de usuario inválido" });
    }

    await departamentosService.quitarUsuario(idDepartamento, idUsuario);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /departamentos/permisos
 * Obtiene los permisos de comunicación entre departamentos
 */
export async function getPermisosComunicacion(req: Request, res: Response, next: NextFunction) {
  try {
    const permisos = await departamentosService.getPermisosComunicacion();

    res.json({ data: permisos });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /departamentos/permisos
 * Configura un permiso de comunicación entre departamentos
 */
export async function configurarPermiso(req: Request, res: Response, next: NextFunction) {
  try {
    const { idDepartamentoOrigen, idDepartamentoDestino, puedeChat, puedeMensajeFormal } = req.body;

    if (!Number.isFinite(idDepartamentoOrigen) || idDepartamentoOrigen <= 0) {
      return res.status(400).json({ error: "ID de departamento origen inválido" });
    }
    if (!Number.isFinite(idDepartamentoDestino) || idDepartamentoDestino <= 0) {
      return res.status(400).json({ error: "ID de departamento destino inválido" });
    }

    await departamentosService.configurarPermiso(
      idDepartamentoOrigen,
      idDepartamentoDestino,
      puedeChat !== false,
      puedeMensajeFormal !== false
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /departamentos/permisos
 * Elimina un permiso de comunicación entre departamentos
 */
export async function eliminarPermiso(req: Request, res: Response, next: NextFunction) {
  try {
    const { idDepartamentoOrigen, idDepartamentoDestino } = req.body;

    if (!Number.isFinite(idDepartamentoOrigen) || idDepartamentoOrigen <= 0) {
      return res.status(400).json({ error: "ID de departamento origen inválido" });
    }
    if (!Number.isFinite(idDepartamentoDestino) || idDepartamentoDestino <= 0) {
      return res.status(400).json({ error: "ID de departamento destino inválido" });
    }

    await departamentosService.eliminarPermiso(idDepartamentoOrigen, idDepartamentoDestino);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /departamentos/usuarios
 * Obtiene todos los usuarios con sus departamentos
 */
export async function getUsuariosConDepartamentos(req: Request, res: Response, next: NextFunction) {
  try {
    const usuarios = await departamentosService.getUsuariosConDepartamentos();

    res.json({ data: usuarios });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /departamentos/usuario/:id
 * Obtiene los departamentos de un usuario específico
 */
export async function getDepartamentosUsuario(req: Request, res: Response, next: NextFunction) {
  try {
    const idUsuario = Number(req.params.id);
    if (!Number.isFinite(idUsuario) || idUsuario <= 0) {
      return res.status(400).json({ error: "ID de usuario inválido" });
    }

    const departamentos = await departamentosService.getDepartamentosUsuario(idUsuario);

    res.json({ data: departamentos });
  } catch (err) {
    next(err);
  }
}
