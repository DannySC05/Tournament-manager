export type MatchStatus = 'PROGRAMADO' | 'EN_JUEGO' | 'FINALIZADO';

export interface Match {
  id: number;
  torneo_id?: number;
  equipo_local_id?: number;
  equipo_visitante_id?: number;
  equipo_local: string;
  equipo_visitante: string;
  fecha: string;
  sede: string;
  ronda: string;
  marcador_local: number | null;
  marcador_visitante: number | null;
  estado: MatchStatus;
}

export interface MatchPayload {
  equipo_local_id: number;
  equipo_visitante_id: number;
  fecha: string;
  sede: string;
  ronda: string;
  estado: Exclude<MatchStatus, 'FINALIZADO'>;
}
