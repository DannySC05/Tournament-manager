import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LucidePencil, LucidePlus, LucideRefreshCw, LucideSearch, LucideTrash2, LucideUsersRound, LucideX } from '@lucide/angular';

import { AuthService } from '../../core/auth/auth.service';
import { SelectionCatalogItem } from '../../core/selections/selection-catalog.models';
import { SelectionCatalogService } from '../../core/selections/selection-catalog.service';
import { Team, TeamPayload, TeamUpdatePayload } from '../../core/teams/team.models';
import { TeamService } from '../../core/teams/team.service';
import { Tournament } from '../../core/tournaments/tournament.models';
import { TournamentService } from '../../core/tournaments/tournament.service';
import { DashboardSidebarComponent } from '../dashboard/components/dashboard-sidebar.component';
import { DashboardTopbarComponent } from '../dashboard/components/dashboard-topbar.component';

@Component({
  selector: 'app-teams-page',
  imports: [ReactiveFormsModule, DashboardSidebarComponent, DashboardTopbarComponent, LucidePencil, LucidePlus, LucideRefreshCw, LucideSearch, LucideTrash2, LucideUsersRound, LucideX],
  templateUrl: './teams.page.html',
  styleUrl: './teams.page.scss'
})
export class TeamsPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly tournamentsApi = inject(TournamentService);
  private readonly teamsApi = inject(TeamService);
  private readonly catalogApi = inject(SelectionCatalogService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly tournaments = signal<Tournament[]>([]);
  protected readonly selectedTournamentId = signal<number | null>(null);
  protected readonly teams = signal<Team[]>([]);
  protected readonly catalog = signal<SelectionCatalogItem[]>([]);
  protected readonly catalogQuery = signal('');
  protected readonly query = signal('');
  protected readonly loadingTournaments = signal(true);
  protected readonly loadingTeams = signal(false);
  protected readonly loadingCatalog = signal(true);
  protected readonly syncingCatalog = signal(false);
  protected readonly saving = signal(false);
  protected readonly deleting = signal(false);
  protected readonly error = signal('');
  protected readonly formError = signal('');
  protected readonly catalogFeedback = signal('');
  protected readonly menuOpen = signal(false);
  protected readonly formOpen = signal(false);
  protected readonly editing = signal<Team | null>(null);
  protected readonly deletingTeam = signal<Team | null>(null);
  protected readonly selectedTournament = computed(() => this.tournaments().find((tournament) => tournament.id === this.selectedTournamentId()) ?? null);
  protected readonly selectedSelection = computed(() => this.catalog().find((selection) => selection.id === this.form.controls.seleccion_catalogo_id.value) ?? null);
  protected readonly visibleTeams = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();
    if (!query) return this.teams();
    return this.teams().filter((team) => `${team.nombre} ${team.codigo_fifa ?? ''} ${team.confederacion ?? ''} ${team.grupo ?? ''}`.toLocaleLowerCase().includes(query));
  });
  protected readonly catalogMatches = computed(() => {
    const query = this.catalogQuery().trim().toLocaleLowerCase();
    const entries = query
      ? this.catalog().filter((selection) => `${selection.nombre} ${selection.codigo_fifa} ${selection.confederacion}`.toLocaleLowerCase().includes(query))
      : this.catalog();
    return entries.slice(0, 8);
  });

  protected readonly form = this.formBuilder.nonNullable.group({
    seleccion_catalogo_id: [0, [Validators.required, Validators.min(1)]],
    grupo: ['', Validators.maxLength(30)]
  });

  ngOnInit(): void {
    this.loadTournaments();
    this.loadCatalog();
  }

  protected changeTournament(value: string): void {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) return;
    this.selectedTournamentId.set(id);
    this.query.set('');
    this.loadTeams();
  }

  protected setQuery(value: string): void { this.query.set(value); }
  protected setCatalogQuery(value: string): void { this.catalogQuery.set(value); }

  protected openCreate(): void {
    if (!this.selectedTournament()) return;
    if (!this.catalog().length) {
      this.error.set('Primero actualiza el catalogo FIFA para seleccionar participantes.');
      return;
    }
    this.editing.set(null);
    this.formOpen.set(true);
    this.formError.set('');
    this.catalogQuery.set('');
    this.form.reset({ seleccion_catalogo_id: 0, grupo: '' });
  }

  protected openEdit(team: Team): void {
    this.editing.set(team);
    this.formOpen.set(true);
    this.formError.set('');
    this.catalogQuery.set('');
    this.form.reset({ seleccion_catalogo_id: team.seleccion_catalogo_id ?? 0, grupo: team.grupo ?? '' });
  }

  protected chooseSelection(selection: SelectionCatalogItem): void {
    this.form.controls.seleccion_catalogo_id.setValue(selection.id);
    this.form.controls.seleccion_catalogo_id.markAsTouched();
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
    this.formError.set('');
  }

  protected syncCatalog(): void {
    this.syncingCatalog.set(true);
    this.catalogFeedback.set('');
    this.error.set('');
    this.catalogApi.syncFifaRanking().subscribe({
      next: ({ message }) => { this.catalogFeedback.set(message); this.loadCatalog(); },
      error: (error: HttpErrorResponse) => this.error.set(error.error?.error ?? 'No fue posible actualizar el catalogo FIFA.'),
      complete: () => this.syncingCatalog.set(false)
    });
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
    const current = this.editing();
    const payload: TeamPayload = { seleccion_catalogo_id: value.seleccion_catalogo_id, grupo: value.grupo.trim() || null };
    const updatePayload: TeamUpdatePayload = { grupo: payload.grupo };
    this.saving.set(true);
    (current ? this.teamsApi.update(current.id, updatePayload) : this.teamsApi.create(tournament.id, payload)).subscribe({
      next: () => { this.closeForm(); this.loadTeams(); },
      error: (error: HttpErrorResponse) => { this.formError.set(error.error?.error ?? 'No fue posible guardar la seleccion. Intenta nuevamente.'); this.saving.set(false); },
      complete: () => this.saving.set(false)
    });
  }

  protected confirmDelete(team: Team): void { this.deletingTeam.set(team); }
  protected cancelDelete(): void { this.deletingTeam.set(null); }

  protected deleteTeam(): void {
    const team = this.deletingTeam();
    if (!team) return;
    this.deleting.set(true);
    this.error.set('');
    this.teamsApi.delete(team.id).subscribe({
      next: () => { this.deletingTeam.set(null); this.loadTeams(); },
      error: (error: HttpErrorResponse) => { this.error.set(error.error?.error ?? 'No fue posible eliminar la seleccion.'); this.deleting.set(false); },
      complete: () => this.deleting.set(false)
    });
  }

  protected onImageError(event: Event, fallbackUrl: string | null | undefined): void {
    const image = event.target as HTMLImageElement;
    if (fallbackUrl && image.src !== fallbackUrl) image.src = fallbackUrl;
    else image.style.display = 'none';
  }

  protected openTournaments(): void { this.router.navigateByUrl('/modulos/torneos'); }
  protected toggleMenu(): void { this.menuOpen.update((open) => !open); }
  protected closeMenu(): void { this.menuOpen.set(false); }

  private loadTournaments(): void {
    this.loadingTournaments.set(true);
    this.error.set('');
    this.tournamentsApi.list().subscribe({
      next: ({ data }) => {
        this.tournaments.set(data);
        if (data.length) { this.selectedTournamentId.set(data[0].id); this.loadTeams(); }
      },
      error: (error: HttpErrorResponse) => this.error.set(error.error?.error ?? 'No fue posible cargar los torneos. Verifica que la API este activa.'),
      complete: () => this.loadingTournaments.set(false)
    });
  }

  private loadCatalog(): void {
    this.loadingCatalog.set(true);
    this.catalogApi.list().subscribe({
      next: ({ data }) => this.catalog.set(data),
      error: (error: HttpErrorResponse) => this.error.set(error.error?.error ?? 'No fue posible cargar el catalogo FIFA.'),
      complete: () => this.loadingCatalog.set(false)
    });
  }

  private loadTeams(): void {
    const tournamentId = this.selectedTournamentId();
    if (!tournamentId) return;
    this.loadingTeams.set(true);
    this.error.set('');
    this.teamsApi.list(tournamentId).subscribe({
      next: ({ data }) => this.teams.set(data),
      error: (error: HttpErrorResponse) => this.error.set(error.error?.error ?? 'No fue posible cargar las selecciones. Verifica que la API este activa.'),
      complete: () => this.loadingTeams.set(false)
    });
  }
}
