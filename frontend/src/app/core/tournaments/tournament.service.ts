import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import { Tournament, TournamentPayload } from './tournament.models';

interface ApiResponse<T> {
  data: T;
}

@Injectable({ providedIn: 'root' })
export class TournamentService {
  private readonly apiUrl = `${environment.apiBaseUrl}/torneos`;

  constructor(private readonly http: HttpClient) {}

  list() {
    return this.http.get<ApiResponse<Tournament[]>>(this.apiUrl);
  }

  create(payload: TournamentPayload) {
    return this.http.post<ApiResponse<Tournament>>(this.apiUrl, payload);
  }

  update(id: number, payload: TournamentPayload) {
    return this.http.put<ApiResponse<Tournament>>(`${this.apiUrl}/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
