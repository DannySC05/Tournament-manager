import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAward, LucideClipboardCheck, LucidePencil, LucideSearch, LucideTrophy, LucideX, LucideCircleHelp, LucideUsersRound } from '@lucide/angular';

import { AuthService } from '../../core/auth/auth.service';
import { Match } from '../../core/matches/match.models';
import { MatchService } from '../../core/matches/match.service';
import { StandingGroup } from '../../core/standings/standing.models';
import { StandingService } from '../../core/standings/standing.service';
import { Tournament } from '../../core/tournaments/tournament.models';
import { TournamentService } from '../../core/tournaments/tournament.service';
import { DashboardSidebarComponent } from '../dashboard/components/dashboard-sidebar.component';
import { DashboardTopbarComponent } from '../dashboard/components/dashboard-topbar.component';
import { StatusBadgeComponent } from '../dashboard/components/status-badge.component';

@Component({
  selector: 'app-positions-page',
  imports: [ReactiveFormsModule, DashboardSidebarComponent, DashboardTopbarComponent, StatusBadgeComponent, LucideAward, LucideClipboardCheck, LucidePencil, LucideSearch, LucideTrophy, LucideX, LucideCircleHelp, LucideUsersRound],
  templateUrl: './positions.page.html',
  styleUrl: './positions.page.scss'
})
export class PositionsPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly tournamentsApi = inject(TournamentService);
  private readonly matchesApi = inject(MatchService);
  private readonly standingsApi = inject(StandingService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  // Common State
  protected readonly tournaments = signal<Tournament[]>([]);
  protected readonly selectedTournamentId = signal<number | null>(null);
  protected readonly loadingTournaments = signal(true);
  protected readonly error = signal('');
  protected readonly menuOpen = signal(false);
  protected readonly selectedTournament = computed(() => this.tournaments().find((tournament) => tournament.id === this.selectedTournamentId()) ?? null);
  protected readonly isElimination = computed(() => this.selectedTournament()?.formato === 'ELIMINACION');

  // View Mode
  protected readonly viewMode = signal<'groups' | 'knockout'>('groups');

  // Standings State
  protected readonly groups = signal<StandingGroup[]>([]);
  protected readonly selectedGroup = signal('');
  protected readonly loadingStandings = signal(false);
  protected readonly visibleGroups = computed(() => this.selectedGroup() ? this.groups().filter((group) => group.grupo === this.selectedGroup()) : this.groups());
  protected readonly hasTeams = computed(() => this.groups().some((group) => group.clasificacion.length > 0));

  // Results State
  protected readonly matches = signal<Match[]>([]);
  protected readonly query = signal('');
  protected readonly loadingMatches = signal(false);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');
  protected readonly formOpen = signal(false);
  protected readonly selectedMatch = signal<Match | null>(null);
  protected readonly pendingMatches = computed(() => this.matches().filter((match) => match.estado !== 'FINALIZADO'));
  protected readonly finishedMatches = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();
    return this.matches().filter((match) => match.estado === 'FINALIZADO' && (!query || `${match.equipo_local} ${match.equipo_visitante} ${match.ronda}`.toLocaleLowerCase().includes(query)))
      .sort((left, right) => new Date(right.fecha).getTime() - new Date(left.fecha).getTime());
  });

  protected readonly form = this.formBuilder.nonNullable.group({
    marcador_local: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
    marcador_visitante: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]]
  });

  constructor() {
    effect(() => {
      if (this.isElimination()) {
        this.viewMode.set('knockout');
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.loadTournaments();
  }

  protected changeTournament(value: string): void {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) return;
    this.selectedTournamentId.set(id);
    this.selectedGroup.set('');
    this.query.set('');
    if (this.isElimination()) {
      this.viewMode.set('knockout');
    } else {
      this.viewMode.set('groups');
    }
    this.loadData();
  }

  protected changeViewMode(mode: 'groups' | 'knockout'): void {
    if (this.isElimination() && mode === 'groups') return;
    this.viewMode.set(mode);
  }

  // Standings Methods
  protected selectGroup(group: string): void {
    this.selectedGroup.set(group);
  }

  protected signed(value: number): string {
    return value > 0 ? `+${value}` : String(value);
  }

  // Results Methods
  protected setQuery(value: string): void {
    this.query.set(value);
  }

  protected openResultForm(match: Match): void {
    this.selectedMatch.set(match);
    this.formOpen.set(true);
    this.formError.set('');
    this.form.reset({ marcador_local: match.marcador_local ?? 0, marcador_visitante: match.marcador_visitante ?? 0 });
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.selectedMatch.set(null);
    this.formError.set('');
  }

  protected submit(): void {
    const match = this.selectedMatch();
    if (!match) return;
    this.formError.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.saving.set(true);
    this.matchesApi.registerResult(match.id, value.marcador_local, value.marcador_visitante).subscribe({
      next: () => {
        this.closeForm();
        this.loadData(); // Reload both standings and matches
      },
      error: (error: HttpErrorResponse) => {
        this.formError.set(error.error?.error ?? 'No fue posible registrar el resultado. Intenta nuevamente.');
        this.saving.set(false);
      },
      complete: () => this.saving.set(false)
    });
  }

  protected openMatches(): void {
    this.router.navigateByUrl('/modulos/partidos');
  }

  protected openTeams(): void {
    this.router.navigateByUrl('/modulos/equipos');
  }

  protected openTournaments(): void {
    this.router.navigateByUrl('/modulos/torneos');
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
  }

  protected formatTime(value: string): string {
    return new Intl.DateTimeFormat('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
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
          if (this.isElimination()) this.viewMode.set('knockout');
          this.loadData();
        }
      },
      error: (error: HttpErrorResponse) => this.error.set(error.error?.error ?? 'No fue posible cargar los torneos. Verifica que la API esté activa.'),
      complete: () => this.loadingTournaments.set(false)
    });
  }

  private loadData(): void {
    this.loadMatches();
    this.loadStandings();
  }

  private loadMatches(): void {
    const tournamentId = this.selectedTournamentId();
    if (!tournamentId) return;
    this.loadingMatches.set(true);
    this.error.set('');
    this.matchesApi.list(tournamentId).subscribe({
      next: ({ data }) => this.matches.set(data),
      error: (error: HttpErrorResponse) => this.error.set(error.error?.error ?? 'No fue posible cargar los partidos del torneo.'),
      complete: () => this.loadingMatches.set(false)
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
