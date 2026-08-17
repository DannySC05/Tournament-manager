import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideCalendarDays, LucidePencil, LucidePlus, LucideSearch, LucideSlidersHorizontal, LucideTrash2, LucideX } from '@lucide/angular';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { Match, MatchPayload, MatchStatus, MatchRound } from '../../core/matches/match.models';
import { MatchService } from '../../core/matches/match.service';
import { Team } from '../../core/teams/team.models';
import { TeamService } from '../../core/teams/team.service';
import { Tournament } from '../../core/tournaments/tournament.models';
import { TournamentService } from '../../core/tournaments/tournament.service';
import { DashboardSidebarComponent } from '../dashboard/components/dashboard-sidebar.component';
import { DashboardTopbarComponent } from '../dashboard/components/dashboard-topbar.component';
import { StatusBadgeComponent } from '../dashboard/components/status-badge.component';

type StatusFilter = 'TODOS' | MatchStatus;

@Component({
  selector: 'app-matches-page',
  imports: [ReactiveFormsModule, DashboardSidebarComponent, DashboardTopbarComponent, StatusBadgeComponent, LucideCalendarDays, LucidePencil, LucidePlus, LucideSearch, LucideSlidersHorizontal, LucideTrash2, LucideX],
  templateUrl: './matches.page.html',
  styleUrl: './matches.page.scss'
})
export class MatchesPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly tournamentsApi = inject(TournamentService);
  private readonly teamsApi = inject(TeamService);
  private readonly matchesApi = inject(MatchService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly tournaments = signal<Tournament[]>([]);
  protected readonly selectedTournamentId = signal<number | null>(null);
  protected readonly teams = signal<Team[]>([]);
  protected readonly matches = signal<Match[]>([]);
  protected readonly query = signal('');
  protected readonly statusFilter = signal<StatusFilter>('TODOS');
  protected readonly dateFilter = signal('');
  protected readonly loadingTournaments = signal(true);
  protected readonly loadingData = signal(false);
  protected readonly saving = signal(false);
  protected readonly deleting = signal(false);
  protected readonly error = signal('');
  protected readonly formError = signal('');
  protected readonly menuOpen = signal(false);
  protected readonly formOpen = signal(false);
  protected readonly editing = signal<Match | null>(null);
  protected readonly deletingMatch = signal<Match | null>(null);
  protected readonly selectedTournament = computed(() => this.tournaments().find((tournament) => tournament.id === this.selectedTournamentId()) ?? null);
  protected readonly canSchedule = computed(() => this.teams().length >= 2);
  protected readonly visibleMatches = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();
    return this.matches().filter((match) => {
      const textMatches = !query || `${match.equipo_local} ${match.equipo_visitante} ${match.sede} ${match.ronda}`.toLocaleLowerCase().includes(query);
      const statusMatches = this.statusFilter() === 'TODOS' || match.estado === this.statusFilter();
      const dateMatches = !this.dateFilter() || match.fecha.slice(0, 10) === this.dateFilter();
      return textMatches && statusMatches && dateMatches;
    });
  });

  protected readonly form = this.formBuilder.nonNullable.group({
    equipo_local_id: [null as number | null],
    equipo_visitante_id: [null as number | null],
    fecha: ['', Validators.required],
    sede: ['', [Validators.required, Validators.minLength(2)]],
    ronda: ['GRUPOS' as MatchRound, Validators.required],
    estado: ['PROGRAMADO' as Exclude<MatchStatus, 'FINALIZADO'>, Validators.required]
  });

  ngOnInit(): void {
    this.loadTournaments();
  }

  protected changeTournament(value: string): void {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) return;
    this.selectedTournamentId.set(id);
    this.clearFilters();
    this.loadTournamentData();
  }

  protected setQuery(value: string): void {
    this.query.set(value);
  }

  protected setStatus(value: string): void {
    this.statusFilter.set(value as StatusFilter);
  }

  protected setDate(value: string): void {
    this.dateFilter.set(value);
  }

  protected clearFilters(): void {
    this.query.set('');
    this.statusFilter.set('TODOS');
    this.dateFilter.set('');
  }

  protected openCreate(): void {
    if (!this.canSchedule()) return;
    this.editing.set(null);
    this.formOpen.set(true);
    this.formError.set('');
    this.form.reset({ equipo_local_id: null, equipo_visitante_id: null, fecha: '', sede: '', ronda: 'GRUPOS', estado: 'PROGRAMADO' });
  }

  protected openEdit(match: Match): void {
    if (match.estado === 'FINALIZADO') return;
    this.editing.set(match);
    this.formOpen.set(true);
    this.formError.set('');
    this.form.reset({
      equipo_local_id: match.equipo_local_id ?? null,
      equipo_visitante_id: match.equipo_visitante_id ?? null,
      fecha: this.datetimeInput(match.fecha),
      sede: match.sede,
      ronda: match.ronda as MatchRound,
      estado: match.estado
    });
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
    this.formError.set('');
  }

  protected submit(): void {
    const tournament = this.selectedTournament();
    if (!tournament) return;
    this.formError.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    if (value.equipo_local_id !== null && value.equipo_visitante_id !== null && value.equipo_local_id === value.equipo_visitante_id) {
      this.formError.set('El equipo local y visitante deben ser diferentes.');
      return;
    }
    const payload: MatchPayload = {
      equipo_local_id: value.equipo_local_id,
      equipo_visitante_id: value.equipo_visitante_id,
      fecha: value.fecha,
      sede: value.sede.trim(),
      ronda: value.ronda as MatchRound,
      estado: value.estado
    };
    const current = this.editing();
    this.saving.set(true);
    (current ? this.matchesApi.update(current.id, payload) : this.matchesApi.create(tournament.id, payload)).subscribe({
      next: () => {
        this.closeForm();
        this.loadTournamentData();
      },
      error: (error: HttpErrorResponse) => {
        this.formError.set(error.error?.error ?? 'No fue posible guardar el partido. Intenta nuevamente.');
        this.saving.set(false);
      },
      complete: () => this.saving.set(false)
    });
  }

  protected confirmDelete(match: Match): void {
    this.deletingMatch.set(match);
  }

  protected cancelDelete(): void {
    this.deletingMatch.set(null);
  }

  protected deleteMatch(): void {
    const match = this.deletingMatch();
    if (!match) return;
    this.deleting.set(true);
    this.error.set('');
    this.matchesApi.delete(match.id).subscribe({
      next: () => {
        this.deletingMatch.set(null);
        this.loadTournamentData();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.error ?? 'No fue posible eliminar el partido.');
        this.deleting.set(false);
      },
      complete: () => this.deleting.set(false)
    });
  }

  protected openTeams(): void {
    this.router.navigateByUrl('/modulos/equipos');
  }

  protected openTournaments(): void {
    this.router.navigateByUrl('/modulos/torneos');
  }

  protected formatStatus(status: MatchStatus): string {
    return { PROGRAMADO: 'PROGRAMADO', EN_JUEGO: 'EN JUEGO', FINALIZADO: 'FINALIZADO' }[status];
  }

  protected formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
  }

  protected score(match: Match): string {
    return match.marcador_local === null || match.marcador_visitante === null ? 'Sin resultado' : `${match.marcador_local} - ${match.marcador_visitante}`;
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
          this.loadTournamentData();
        }
      },
      error: (error: HttpErrorResponse) => this.error.set(error.error?.error ?? 'No fue posible cargar los torneos. Verifica que la API esté activa.'),
      complete: () => this.loadingTournaments.set(false)
    });
  }

  private loadTournamentData(): void {
    const tournamentId = this.selectedTournamentId();
    if (!tournamentId) return;
    this.loadingData.set(true);
    this.error.set('');
    forkJoin({
      teams: this.teamsApi.list(tournamentId),
      matches: this.matchesApi.list(tournamentId)
    }).subscribe({
      next: ({ teams, matches }) => {
        this.teams.set(teams.data);
        this.matches.set(matches.data);
      },
      error: (error: HttpErrorResponse) => this.error.set(error.error?.error ?? 'No fue posible cargar la información del torneo.'),
      complete: () => this.loadingData.set(false)
    });
  }

  private datetimeInput(value: string): string {
    return value.slice(0, 16);
  }
}
