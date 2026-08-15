export interface Team {
  id: number;
  torneo_id?: number;
  seleccion_catalogo_id?: number | null;
  nombre: string;
  grupo: string | null;
  codigo_fifa?: string | null;
  confederacion?: string | null;
  escudo_url?: string | null;
  bandera_url?: string | null;
  ranking_fifa?: number | null;
  ranking_actualizado_en?: string | null;
}

export interface TeamPayload {
  seleccion_catalogo_id: number;
  grupo: string | null;
}

export interface TeamUpdatePayload {
  grupo: string | null;
}
