export type TournamentStatus = 'BORRADOR' | 'EN_CURSO' | 'FINALIZADO';
export type MatchStatus = 'PROGRAMADO' | 'EN_JUEGO' | 'FINALIZADO';

export interface Tournament {
  id: number;
  nombre: string;
  deporte: string;
  formato: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: TournamentStatus;
  equipos_count?: number;
}

export interface Team {
  id: number;
  nombre: string;
  grupo: string | null;
}

export interface Match {
  id: number;
  equipo_local: string;
  equipo_visitante: string;
  fecha: string;
  sede: string;
  ronda: string;
  marcador_local: number | null;
  marcador_visitante: number | null;
  estado: MatchStatus;
}

export interface DashboardData {
  tournament: Tournament;
  teams: Team[];
  matches: Match[];
  isPreview: boolean;
}
