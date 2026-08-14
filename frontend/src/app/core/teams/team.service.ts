import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import { Team, TeamPayload } from './team.models';

interface ApiResponse<T> {
  data: T;
}

@Injectable({ providedIn: 'root' })
export class TeamService {
  private readonly apiUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  list(tournamentId: number) {
    return this.http.get<ApiResponse<Team[]>>(`${this.apiUrl}/torneos/${tournamentId}/equipos`);
  }

  create(tournamentId: number, payload: TeamPayload) {
    return this.http.post<ApiResponse<Team>>(`${this.apiUrl}/torneos/${tournamentId}/equipos`, payload);
  }

  update(id: number, payload: TeamPayload) {
    return this.http.put<ApiResponse<Team>>(`${this.apiUrl}/equipos/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/equipos/${id}`);
  }
}
