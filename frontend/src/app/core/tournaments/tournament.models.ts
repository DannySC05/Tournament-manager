export type TournamentFormat = 'LIGA' | 'ELIMINACION' | 'MIXTO';
export type TournamentStatus = 'BORRADOR' | 'EN_CURSO' | 'FINALIZADO';

export interface Tournament {
  id: number;
  nombre: string;
  deporte: string;
  formato: TournamentFormat;
  participantes_count: number;
  cantidad_grupos: number | null;
  ganador_equipo_id: number | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: TournamentStatus;
  equipos_count?: number;
}

export interface TournamentPayload {
  nombre: string;
  formato: TournamentFormat;
  participantes_count: number;
  cantidad_grupos: number | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado?: TournamentStatus;
  ganador_equipo_id?: number | null;
}
