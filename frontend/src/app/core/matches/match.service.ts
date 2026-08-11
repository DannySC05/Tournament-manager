import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Match, MatchPayload } from './match.models';

interface ApiResponse<T> {
  data: T;
}

@Injectable({ providedIn: 'root' })
export class MatchService {
  private readonly apiUrl = 'http://localhost:3000/api';

  constructor(private readonly http: HttpClient) {}

  list(tournamentId: number) {
    return this.http.get<ApiResponse<Match[]>>(`${this.apiUrl}/torneos/${tournamentId}/partidos`);
  }

  create(tournamentId: number, payload: MatchPayload) {
    return this.http.post<ApiResponse<Match>>(`${this.apiUrl}/torneos/${tournamentId}/partidos`, payload);
  }

  update(id: number, payload: MatchPayload) {
    return this.http.put<ApiResponse<Match>>(`${this.apiUrl}/partidos/${id}`, payload);
  }

  registerResult(id: number, marcadorLocal: number, marcadorVisitante: number) {
    return this.http.put<ApiResponse<Match>>(`${this.apiUrl}/partidos/${id}/resultado`, {
      marcador_local: marcadorLocal,
      marcador_visitante: marcadorVisitante
    });
  }

  delete(id: number) {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/partidos/${id}`);
  }
}
