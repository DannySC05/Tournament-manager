export interface Team {
  id: number;
  torneo_id?: number;
  nombre: string;
  grupo: string | null;
}

export interface TeamPayload {
  nombre: string;
  grupo: string | null;
}
