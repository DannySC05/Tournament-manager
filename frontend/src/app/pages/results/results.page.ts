import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAward, LucideClipboardCheck, LucidePencil, LucideSearch, LucideTrophy, LucideX } from '@lucide/angular';

import { AuthService } from '../../core/auth/auth.service';
import { Match } from '../../core/matches/match.models';
import { MatchService } from '../../core/matches/match.service';
import { Tournament } from '../../core/tournaments/tournament.models';
import { TournamentService } from '../../core/tournaments/tournament.service';
import { DashboardSidebarComponent } from '../dashboard/components/dashboard-sidebar.component';
import { DashboardTopbarComponent } from '../dashboard/components/dashboard-topbar.component';
import { StatusBadgeComponent } from '../dashboard/components/status-badge.component';

@Component({
  selector: 'app-results-page',
  imports: [ReactiveFormsModule, DashboardSidebarComponent, DashboardTopbarComponent, StatusBadgeComponent, LucideAward, LucideClipboardCheck, LucidePencil, LucideSearch, LucideTrophy, LucideX],
  templateUrl: './results.page.html',
  styleUrl: './results.page.scss'
})
export class ResultsPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly tournamentsApi = inject(TournamentService);
  private readonly matchesApi = inject(MatchService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly tournaments = signal<Tournament[]>([]);
  protected readonly selectedTournamentId = signal<number | null>(null);
  protected readonly matches = signal<Match[]>([]);
  protected readonly query = signal('');
  protected readonly loadingTournaments = signal(true);
  protected readonly loadingMatches = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly formError = signal('');
  protected readonly menuOpen = signal(false);
  protected readonly formOpen = signal(false);
  protected readonly selectedMatch = signal<Match | null>(null);
  protected readonly selectedTournament = computed(() => this.tournaments().find((tournament) => tournament.id === this.selectedTournamentId()) ?? null);
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

  ngOnInit(): void {
    this.loadTournaments();
  }

  protected changeTournament(value: string): void {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) return;
    this.selectedTournamentId.set(id);
    this.query.set('');
    this.loadMatches();
  }

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
        this.loadMatches();
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
          this.loadMatches();
        }
      },
      error: (error: HttpErrorResponse) => this.error.set(error.error?.error ?? 'No fue posible cargar los torneos. Verifica que la API esté activa.'),
      complete: () => this.loadingTournaments.set(false)
    });
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
}
