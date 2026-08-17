export type MatchStatus = 'PROGRAMADO' | 'EN_JUEGO' | 'FINALIZADO';
export type MatchRound = 'GRUPOS' | 'OCTAVOS' | 'CUARTOS' | 'SEMIFINAL' | 'FINAL';

export interface Match {
  id: number;
  torneo_id?: number;
  equipo_local_id: number | null;
  equipo_visitante_id: number | null;
  equipo_local: string;
  equipo_visitante: string;
  fecha: string;
  sede: string;
  ronda: MatchRound | string;
  marcador_local: number | null;
  marcador_visitante: number | null;
  estado: MatchStatus;
}

export interface MatchPayload {
  equipo_local_id: number | null;
  equipo_visitante_id: number | null;
  fecha: string;
  sede: string;
  ronda: MatchRound;
  estado: Exclude<MatchStatus, 'FINALIZADO'>;
}
