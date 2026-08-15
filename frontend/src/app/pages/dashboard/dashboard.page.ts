import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { StandingGroup, StandingRow } from '../../core/standings/standing.models';
import { StandingService } from '../../core/standings/standing.service';
import { DashboardSidebarComponent } from './components/dashboard-sidebar.component';
import { DashboardStandingsComponent } from './components/dashboard-standings.component';
import { DashboardTopbarComponent } from './components/dashboard-topbar.component';
import { QuickActionsComponent } from './components/quick-actions.component';
import { RecentResultsComponent } from './components/recent-results.component';
import { StatCardComponent } from './components/stat-card.component';
import { UpcomingMatchesComponent } from './components/upcoming-matches.component';
import { WorldCupBannerComponent } from './components/world-cup-banner.component';
import { DashboardData, Match, MatchStatus, TournamentStatus } from './dashboard.models';
import { DashboardService } from './dashboard.service';

@Component({
  selector: 'app-dashboard-page',
  imports: [
    DashboardSidebarComponent,
    DashboardStandingsComponent,
    DashboardTopbarComponent,
    QuickActionsComponent,
    RecentResultsComponent,
    StatCardComponent,
    UpcomingMatchesComponent,
    WorldCupBannerComponent
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss'
})
export class DashboardPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly standingsApi = inject(StandingService);
  private readonly router = inject(Router);

  protected readonly data = signal<DashboardData | null>(null);
  protected readonly standings = signal<StandingGroup[]>([]);
  protected readonly menuOpen = signal(false);
  protected readonly loading = signal(true);

  protected readonly currentTournament = computed(() => this.data()?.tournament ?? null);
  protected readonly tournaments = computed(() => this.data()?.tournaments ?? []);
  protected readonly teams = computed(() => this.data()?.teams ?? []);
  protected readonly sortedMatches = computed(() => [...(this.data()?.matches ?? [])].sort((left, right) => new Date(left.fecha).getTime() - new Date(right.fecha).getTime()));
  protected readonly upcomingMatches = computed(() => this.sortedMatches().filter((match) => match.estado === 'PROGRAMADO').slice(0, 4));
  protected readonly recentMatches = computed(() => [...this.sortedMatches()].filter((match) => match.estado === 'FINALIZADO').reverse().slice(0, 4));
  protected readonly currentPhase = computed(() => this.sortedMatches().find((match) => match.estado === 'EN_JUEGO')?.ronda ?? this.upcomingMatches()[0]?.ronda ?? 'Fase por definir');
  protected readonly durationDays = computed(() => {
    const tournament = this.currentTournament();
    if (!tournament?.fecha_inicio || !tournament.fecha_fin) return 0;
    const start = new Date(tournament.fecha_inicio).getTime();
    const end = new Date(tournament.fecha_fin).getTime();
    return Math.max(0, Math.ceil((end - start) / 86_400_000));
  });
  protected readonly stats = computed(() => {
    const matches = this.sortedMatches();
    return [
      { icon: 'calendar' as const, value: matches.filter((match) => match.estado === 'PROGRAMADO').length, label: 'Partidos programados', detail: 'Proximos 7 dias', tone: 'gold' as const },
      { icon: 'users' as const, value: this.teams().length, label: 'Selecciones', detail: 'Registradas', tone: 'green' as const },
      { icon: 'medal' as const, value: matches.filter((match) => match.estado === 'FINALIZADO').length, label: 'Partidos jugados', detail: 'Total acumulado', tone: 'gold' as const }
    ];
  });

  ngOnInit(): void {
    this.loadOverview();
  }

  protected changeTournament(tournamentId: number): void {
    if (!Number.isInteger(tournamentId) || tournamentId === this.currentTournament()?.id) return;
    this.loadOverview(tournamentId);
  }

  private loadOverview(tournamentId?: number): void {
    this.loading.set(true);
    this.dashboardService.loadOverview(tournamentId).pipe(
      switchMap((data) => {
        const fallback = this.deriveStandings(data);
        if (data.isPreview || data.tournament.id <= 0) return of({ data, standings: fallback });
        return this.standingsApi.get(data.tournament.id).pipe(
          map(({ data: classification }) => ({ data, standings: classification.grupos.length ? classification.grupos : fallback })),
          catchError(() => of({ data, standings: fallback }))
        );
      })
    ).subscribe(({ data, standings }) => {
      this.data.set(data);
      this.standings.set(standings);
      this.loading.set(false);
    });
  }

  protected toggleMenu(): void { this.menuOpen.update((open) => !open); }
  protected closeMenu(): void { this.menuOpen.set(false); }
  protected openModule(module: string): void { this.router.navigate(['/modulos', module]); }

  protected formatTournamentStatus(status: TournamentStatus): string {
    return { BORRADOR: 'BORRADOR', EN_CURSO: 'EN CURSO', FINALIZADO: 'FINALIZADO' }[status];
  }

  protected dateRange(): string {
    const tournament = this.currentTournament();
    if (!tournament) return '';
    const start = this.shortDate(tournament.fecha_inicio);
    return tournament.fecha_fin ? `${start} - ${this.shortDate(tournament.fecha_fin)}` : start;
  }

  private shortDate(value: string): string {
    return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
  }

  private deriveStandings(data: DashboardData): StandingGroup[] {
    const records = new Map<string, StandingRow>();
    data.teams.forEach((team) => {
      records.set(team.nombre, this.createRecord(team.id, team.nombre, team.grupo));
    });

    data.matches.filter((match) => match.estado === 'FINALIZADO' && match.marcador_local !== null && match.marcador_visitante !== null).forEach((match) => {
      const local = records.get(match.equipo_local) ?? this.createRecord(-match.id, match.equipo_local, null);
      const visitor = records.get(match.equipo_visitante) ?? this.createRecord(-(match.id + 10_000), match.equipo_visitante, null);
      records.set(local.equipo_nombre, local);
      records.set(visitor.equipo_nombre, visitor);
      this.registerMatch(local, visitor, match);
    });

    const byGroup = new Map<string, StandingRow[]>();
    records.forEach((record) => {
      const group = record.grupo || 'Tabla general';
      byGroup.set(group, [...(byGroup.get(group) ?? []), record]);
    });
    return [...byGroup.entries()].map(([grupo, rows]) => ({
      grupo,
      clasificacion: rows.sort((left, right) => right.puntos - left.puntos || right.diferencia_goles - left.diferencia_goles || right.goles_favor - left.goles_favor || left.equipo_nombre.localeCompare(right.equipo_nombre)).map((row, index) => ({ ...row, posicion: index + 1 }))
    }));
  }

  private createRecord(id: number, name: string, group: string | null): StandingRow {
    return { equipo_id: id, equipo_nombre: name, grupo: group, posicion: 0, partidos_jugados: 0, partidos_ganados: 0, partidos_empatados: 0, partidos_perdidos: 0, goles_favor: 0, goles_contra: 0, diferencia_goles: 0, puntos: 0 };
  }

  private registerMatch(local: StandingRow, visitor: StandingRow, match: Match): void {
    const localScore = match.marcador_local as number;
    const visitorScore = match.marcador_visitante as number;
    local.partidos_jugados += 1;
    visitor.partidos_jugados += 1;
    local.goles_favor += localScore;
    local.goles_contra += visitorScore;
    visitor.goles_favor += visitorScore;
    visitor.goles_contra += localScore;
    local.diferencia_goles = local.goles_favor - local.goles_contra;
    visitor.diferencia_goles = visitor.goles_favor - visitor.goles_contra;
    if (localScore === visitorScore) { local.partidos_empatados += 1; visitor.partidos_empatados += 1; local.puntos += 1; visitor.puntos += 1; return; }
    const winner = localScore > visitorScore ? local : visitor;
    const loser = winner === local ? visitor : local;
    winner.partidos_ganados += 1;
    winner.puntos += 3;
    loser.partidos_perdidos += 1;
  }
}
