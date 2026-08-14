import { TitleCasePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { DashboardSidebarComponent } from './components/dashboard-sidebar.component';
import { DashboardTopbarComponent } from './components/dashboard-topbar.component';
import { StatCardComponent } from './components/stat-card.component';
import { StatusBadgeComponent } from './components/status-badge.component';
import { DashboardData, Match, MatchStatus, TournamentStatus } from './dashboard.models';
import { DashboardService } from './dashboard.service';

@Component({
  selector: 'app-dashboard-page',
  imports: [TitleCasePipe, DashboardSidebarComponent, DashboardTopbarComponent, StatCardComponent, StatusBadgeComponent],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss'
})
export class DashboardPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly router = inject(Router);

  protected readonly data = signal<DashboardData | null>(null);
  protected readonly menuOpen = signal(false);
  protected readonly loading = signal(true);

  protected readonly currentTournament = computed(() => this.data()?.tournament ?? null);
  protected readonly teams = computed(() => this.data()?.teams ?? []);
  protected readonly sortedMatches = computed(() => [...(this.data()?.matches ?? [])].sort((left, right) => new Date(left.fecha).getTime() - new Date(right.fecha).getTime()));
  protected readonly nextMatch = computed(() => this.sortedMatches().find((match) => match.estado !== 'FINALIZADO') ?? null);
  protected readonly upcomingMatches = computed(() => this.sortedMatches().filter((match) => match.estado !== 'FINALIZADO').slice(0, 3));
  protected readonly recentMatches = computed(() => this.sortedMatches().filter((match) => match.estado === 'FINALIZADO').reverse().slice(0, 3));
  protected readonly stats = computed(() => {
    const matches = this.sortedMatches();
    return [
      { icon: 'users' as const, value: this.teams().length, label: 'Equipos' },
      { icon: 'calendar' as const, value: matches.length, label: 'Partidos' },
      { icon: 'live' as const, value: matches.filter((match) => match.estado === 'EN_JUEGO').length, label: 'En juego' },
      { icon: 'medal' as const, value: matches.filter((match) => match.estado === 'FINALIZADO').length, label: 'Finalizados' }
    ];
  });

  ngOnInit(): void {
    this.dashboardService.loadOverview().subscribe((data) => {
      this.data.set(data);
      this.loading.set(false);
    });
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected openModule(module: string): void {
    this.router.navigate(['/modulos', module]);
  }

  protected formatTournamentStatus(status: TournamentStatus): string {
    return { BORRADOR: 'BORRADOR', EN_CURSO: 'EN CURSO', FINALIZADO: 'FINALIZADO' }[status];
  }

  protected formatMatchStatus(status: MatchStatus): string {
    return { PROGRAMADO: 'PROGRAMADO', EN_JUEGO: 'EN JUEGO', FINALIZADO: 'FINALIZADO' }[status];
  }

  protected dateRange(): string {
    const tournament = this.currentTournament();
    if (!tournament) return '';
    const start = this.longDate(tournament.fecha_inicio);
    return tournament.fecha_fin ? `${start} - ${this.longDate(tournament.fecha_fin)}` : start;
  }

  protected longDate(value: string): string {
    return new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
  }

  protected matchDay(value: string): string {
    const date = new Date(value);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const key = (item: Date) => `${item.getFullYear()}-${item.getMonth()}-${item.getDate()}`;
    if (key(date) === key(today)) return 'HOY';
    if (key(date) === key(tomorrow)) return 'MAÑANA';
    return new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'short' }).format(date).toUpperCase();
  }

  protected matchTime(value: string): string {
    return new Intl.DateTimeFormat('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
  }

  protected teamCode(name: string): string {
    return name.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(Boolean).map((word) => word[0]).join('').slice(0, 3).toUpperCase();
  }

  protected trackByMatch(_: number, match: Match): number {
    return match.id;
  }
}
