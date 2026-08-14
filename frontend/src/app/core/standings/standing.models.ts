export interface StandingRow {
  equipo_id: number;
  equipo_nombre: string;
  grupo: string | null;
  posicion: number;
  partidos_jugados: number;
  partidos_ganados: number;
  partidos_empatados: number;
  partidos_perdidos: number;
  goles_favor: number;
  goles_contra: number;
  diferencia_goles: number;
  puntos: number;
}

export interface StandingGroup {
  grupo: string;
  clasificacion: StandingRow[];
}

export interface StandingData {
  grupos: StandingGroup[];
}
