import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';

import { DashboardData, Match, Team, Tournament } from './dashboard.models';

interface ApiResponse<T> {
  data: T;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly apiUrl = 'http://localhost:3000/api';

  constructor(private readonly http: HttpClient) {}

  loadOverview(): Observable<DashboardData> {
    return this.http.get<ApiResponse<Tournament[]>>(`${this.apiUrl}/torneos`).pipe(
      switchMap(({ data }) => {
        const tournament = data[0];
        if (!tournament) return of(this.previewData());

        return forkJoin({
          teams: this.http.get<ApiResponse<Team[]>>(`${this.apiUrl}/torneos/${tournament.id}/equipos`),
          matches: this.http.get<ApiResponse<Match[]>>(`${this.apiUrl}/torneos/${tournament.id}/partidos`)
        }).pipe(map(({ teams, matches }) => ({ tournament, teams: teams.data, matches: matches.data, isPreview: false })));
      }),
      catchError(() => of(this.previewData()))
    );
  }

  private previewData(): DashboardData {
    return {
      isPreview: true,
      tournament: {
        id: 0,
        nombre: 'Copa UCSG 2026',
        deporte: 'Futbol',
        formato: 'LIGA',
        fecha_inicio: '2026-08-10T00:00:00',
        fecha_fin: '2026-09-20T00:00:00',
        estado: 'EN_CURSO',
        equipos_count: 12
      },
      teams: [
        { id: 1, nombre: 'Barcelona SC', grupo: null },
        { id: 2, nombre: 'Emelec', grupo: null },
        { id: 3, nombre: 'Liga FC', grupo: null },
        { id: 4, nombre: 'Norte FC', grupo: null },
        { id: 5, nombre: 'Atletico', grupo: null },
        { id: 6, nombre: 'Sur FC', grupo: null },
        { id: 7, nombre: 'Deportivo Oeste', grupo: null },
        { id: 8, nombre: 'Union Central', grupo: null },
        { id: 9, nombre: 'Puerto Azul', grupo: null },
        { id: 10, nombre: 'Santa Maria', grupo: null },
        { id: 11, nombre: 'San Marcos', grupo: null },
        { id: 12, nombre: 'Campus FC', grupo: null }
      ],
      matches: [
        { id: 1, equipo_local: 'Barcelona SC', equipo_visitante: 'Emelec', fecha: '2026-08-10T18:30:00', sede: 'Estadio Principal', ronda: 'Jornada 4', marcador_local: null, marcador_visitante: null, estado: 'PROGRAMADO' },
        { id: 2, equipo_local: 'Liga FC', equipo_visitante: 'Norte FC', fecha: '2026-08-10T20:00:00', sede: 'Cancha 2', ronda: 'Jornada 4', marcador_local: null, marcador_visitante: null, estado: 'PROGRAMADO' },
        { id: 3, equipo_local: 'Atletico', equipo_visitante: 'Sur FC', fecha: '2026-08-11T17:30:00', sede: 'Estadio Principal', ronda: 'Jornada 4', marcador_local: null, marcador_visitante: null, estado: 'PROGRAMADO' },
        { id: 4, equipo_local: 'Barcelona SC', equipo_visitante: 'Norte FC', fecha: '2026-08-09T18:30:00', sede: 'Cancha 1', ronda: 'Jornada 3', marcador_local: 3, marcador_visitante: 1, estado: 'FINALIZADO' },
        { id: 5, equipo_local: 'Emelec', equipo_visitante: 'Liga FC', fecha: '2026-08-09T20:00:00', sede: 'Cancha 2', ronda: 'Jornada 3', marcador_local: 2, marcador_visitante: 2, estado: 'FINALIZADO' },
        { id: 6, equipo_local: 'Atletico', equipo_visitante: 'Sur FC', fecha: '2026-08-08T17:30:00', sede: 'Estadio Principal', ronda: 'Jornada 3', marcador_local: 0, marcador_visitante: 2, estado: 'FINALIZADO' },
        { id: 7, equipo_local: 'Puerto Azul', equipo_visitante: 'Campus FC', fecha: '2026-08-07T19:00:00', sede: 'Cancha 1', ronda: 'Jornada 3', marcador_local: 1, marcador_visitante: 1, estado: 'EN_JUEGO' },
        { id: 8, equipo_local: 'San Marcos', equipo_visitante: 'Santa Maria', fecha: '2026-08-06T19:00:00', sede: 'Cancha 2', ronda: 'Jornada 3', marcador_local: 0, marcador_visitante: 1, estado: 'FINALIZADO' },
        { id: 9, equipo_local: 'Deportivo Oeste', equipo_visitante: 'Union Central', fecha: '2026-08-05T19:00:00', sede: 'Cancha 1', ronda: 'Jornada 3', marcador_local: 2, marcador_visitante: 0, estado: 'FINALIZADO' },
        { id: 10, equipo_local: 'Campus FC', equipo_visitante: 'Liga FC', fecha: '2026-08-04T19:00:00', sede: 'Cancha 2', ronda: 'Jornada 3', marcador_local: 1, marcador_visitante: 3, estado: 'FINALIZADO' },
        { id: 11, equipo_local: 'Emelec', equipo_visitante: 'Atletico', fecha: '2026-08-03T19:00:00', sede: 'Cancha 1', ronda: 'Jornada 3', marcador_local: 1, marcador_visitante: 0, estado: 'FINALIZADO' },
        { id: 12, equipo_local: 'Norte FC', equipo_visitante: 'Sur FC', fecha: '2026-08-02T19:00:00', sede: 'Cancha 2', ronda: 'Jornada 3', marcador_local: 0, marcador_visitante: 2, estado: 'FINALIZADO' },
        { id: 13, equipo_local: 'Barcelona SC', equipo_visitante: 'Union Central', fecha: '2026-08-01T19:00:00', sede: 'Cancha 1', ronda: 'Jornada 2', marcador_local: 2, marcador_visitante: 0, estado: 'FINALIZADO' },
        { id: 14, equipo_local: 'Liga FC', equipo_visitante: 'Santa Maria', fecha: '2026-07-31T19:00:00', sede: 'Cancha 2', ronda: 'Jornada 2', marcador_local: 4, marcador_visitante: 1, estado: 'FINALIZADO' },
        { id: 15, equipo_local: 'Emelec', equipo_visitante: 'Deportivo Oeste', fecha: '2026-07-30T19:00:00', sede: 'Cancha 1', ronda: 'Jornada 2', marcador_local: 2, marcador_visitante: 1, estado: 'FINALIZADO' },
        { id: 16, equipo_local: 'Atletico', equipo_visitante: 'Puerto Azul', fecha: '2026-07-29T19:00:00', sede: 'Cancha 2', ronda: 'Jornada 2', marcador_local: 1, marcador_visitante: 0, estado: 'FINALIZADO' }
      ]
    };
  }
}
