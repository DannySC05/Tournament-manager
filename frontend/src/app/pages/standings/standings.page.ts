import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideChartNoAxesCombined, LucideCircleHelp, LucideTrophy, LucideUsersRound } from '@lucide/angular';

import { AuthService } from '../../core/auth/auth.service';
import { StandingGroup } from '../../core/standings/standing.models';
import { StandingService } from '../../core/standings/standing.service';
import { Tournament } from '../../core/tournaments/tournament.models';
import { TournamentService } from '../../core/tournaments/tournament.service';
import { DashboardSidebarComponent } from '../dashboard/components/dashboard-sidebar.component';
import { DashboardTopbarComponent } from '../dashboard/components/dashboard-topbar.component';

@Component({
  selector: 'app-standings-page',
  imports: [DashboardSidebarComponent, DashboardTopbarComponent, LucideChartNoAxesCombined, LucideCircleHelp, LucideTrophy, LucideUsersRound],
  templateUrl: './standings.page.html',
  styleUrl: './standings.page.scss'
})
export class StandingsPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly tournamentsApi = inject(TournamentService);
  private readonly standingsApi = inject(StandingService);
  private readonly router = inject(Router);

  protected readonly tournaments = signal<Tournament[]>([]);
  protected readonly selectedTournamentId = signal<number | null>(null);
  protected readonly groups = signal<StandingGroup[]>([]);
  protected readonly selectedGroup = signal('');
  protected readonly loadingTournaments = signal(true);
  protected readonly loadingStandings = signal(false);
  protected readonly error = signal('');
  protected readonly menuOpen = signal(false);
  protected readonly selectedTournament = computed(() => this.tournaments().find((tournament) => tournament.id === this.selectedTournamentId()) ?? null);
  protected readonly isElimination = computed(() => this.selectedTournament()?.formato === 'ELIMINACION');
  protected readonly visibleGroups = computed(() => this.selectedGroup() ? this.groups().filter((group) => group.grupo === this.selectedGroup()) : this.groups());
  protected readonly hasTeams = computed(() => this.groups().some((group) => group.clasificacion.length > 0));

  ngOnInit(): void {
    this.loadTournaments();
  }

  protected changeTournament(value: string): void {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) return;
    this.selectedTournamentId.set(id);
    this.selectedGroup.set('');
    this.loadStandings();
  }

  protected selectGroup(group: string): void {
    this.selectedGroup.set(group);
  }

  protected openResults(): void {
    this.router.navigateByUrl('/modulos/resultados');
  }

  protected openTeams(): void {
    this.router.navigateByUrl('/modulos/equipos');
  }

  protected openTournaments(): void {
    this.router.navigateByUrl('/modulos/torneos');
  }

  protected signed(value: number): string {
    return value > 0 ? `+${value}` : String(value);
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  private loadTournaments(): void {
    this.loadingTournaments.set(true);
    this.error.set('');
    this.tournamentsApi.list().subscribe({
      next: ({ data }) => {
        this.tournaments.set(data);
        if (data.length) {
          this.selectedTournamentId.set(data[0].id);
          this.loadStandings();
        }
      },
      error: (error: HttpErrorResponse) => this.error.set(error.error?.error ?? 'No fue posible cargar los torneos. Verifica que la API esté activa.'),
      complete: () => this.loadingTournaments.set(false)
    });
  }

  private loadStandings(): void {
    const tournament = this.selectedTournament();
    if (!tournament) return;
    this.groups.set([]);
    this.selectedGroup.set('');
    if (tournament.formato === 'ELIMINACION') return;

    this.loadingStandings.set(true);
    this.error.set('');
    this.standingsApi.get(tournament.id).subscribe({
      next: ({ data }) => this.groups.set(data.grupos),
      error: (error: HttpErrorResponse) => this.error.set(error.error?.error ?? 'No fue posible calcular la clasificación.'),
      complete: () => this.loadingStandings.set(false)
    });
  }
}
