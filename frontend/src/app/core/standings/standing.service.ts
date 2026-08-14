import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import { StandingData } from './standing.models';

@Injectable({ providedIn: 'root' })
export class StandingService {
  private readonly apiUrl = `${environment.apiBaseUrl}/torneos`;

  constructor(private readonly http: HttpClient) {}

  get(tournamentId: number) {
    return this.http.get<{ data: StandingData }>(`${this.apiUrl}/${tournamentId}/clasificacion`);
  }
}
