export type DeletePolicy =
  | { mode: "hard" } // DELETE físico
  | { mode: "soft"; field: string; inactiveValue: any; extraOnDelete?: Record<string, any> } // Activo/Activa = 0
  | { mode: "state"; field: string; canceledValue: any; extraOnDelete?: Record<string, any> } // Estado = ANULADO/ANULADA
  | { mode: "forbid" }; // no permitir DELETE

export type TableConfig = {
  /** segmento URL */
  path: string;

  /** nombre tabla en Postgres */
  table: string;

  /** PK (1 o varias columnas en caso de PK compuesta) */
  pk: string[];

  /** política de borrado */
  deletePolicy: DeletePolicy;

  /** filtro por defecto (ej: Activo=1) si no pasas ?includeInactive=1 */
  defaultFilters?: Record<string, any>;
};
