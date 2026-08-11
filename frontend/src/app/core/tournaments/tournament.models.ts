export type TournamentFormat = 'LIGA' | 'ELIMINACION' | 'MIXTO';
export type TournamentStatus = 'BORRADOR' | 'EN_CURSO' | 'FINALIZADO';

export interface Tournament {
  id: number;
  nombre: string;
  deporte: string;
  formato: TournamentFormat;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: TournamentStatus;
  equipos_count?: number;
}

export interface TournamentPayload {
  nombre: string;
  deporte: string;
  formato: TournamentFormat;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: TournamentStatus;
}
