import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucidePencil, LucidePlus, LucideSearch, LucideTrash2, LucideTrophy, LucideX } from '@lucide/angular';

import { AuthService } from '../../core/auth/auth.service';
import { Tournament, TournamentFormat, TournamentPayload, TournamentStatus } from '../../core/tournaments/tournament.models';
import { TournamentService } from '../../core/tournaments/tournament.service';
import { DashboardSidebarComponent } from '../dashboard/components/dashboard-sidebar.component';
import { DashboardTopbarComponent } from '../dashboard/components/dashboard-topbar.component';
import { StatusBadgeComponent } from '../dashboard/components/status-badge.component';

@Component({
  selector: 'app-tournaments-page',
  imports: [ReactiveFormsModule, DashboardSidebarComponent, DashboardTopbarComponent, StatusBadgeComponent, LucidePencil, LucidePlus, LucideSearch, LucideTrash2, LucideTrophy, LucideX],
  templateUrl: './tournaments.page.html',
  styleUrl: './tournaments.page.scss'
})
export class TournamentsPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly tournamentsApi = inject(TournamentService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly tournaments = signal<Tournament[]>([]);
  protected readonly query = signal('');
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly deleting = signal(false);
  protected readonly error = signal('');
  protected readonly formError = signal('');
  protected readonly menuOpen = signal(false);
  protected readonly formOpen = signal(false);
  protected readonly editing = signal<Tournament | null>(null);
  protected readonly deletingTournament = signal<Tournament | null>(null);
  protected readonly visibleTournaments = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();
    if (!query) return this.tournaments();
    return this.tournaments().filter((tournament) => [tournament.nombre, tournament.deporte, tournament.formato, tournament.estado]
      .some((value) => value.toLocaleLowerCase().includes(query)));
  });

  protected readonly form = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    deporte: ['Futbol', [Validators.required, Validators.minLength(2)]],
    formato: ['LIGA' as TournamentFormat, Validators.required],
    fecha_inicio: ['', Validators.required],
    fecha_fin: [''],
    estado: ['BORRADOR' as TournamentStatus, Validators.required]
  });

  ngOnInit(): void {
    this.loadTournaments();
  }

  protected setQuery(value: string): void {
    this.query.set(value);
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.formOpen.set(true);
    this.formError.set('');
    this.form.reset({ nombre: '', deporte: 'Futbol', formato: 'LIGA', fecha_inicio: '', fecha_fin: '', estado: 'BORRADOR' });
  }

  protected openEdit(tournament: Tournament): void {
    this.editing.set(tournament);
    this.formOpen.set(true);
    this.formError.set('');
    this.form.reset({
      nombre: tournament.nombre,
      deporte: tournament.deporte,
      formato: tournament.formato,
      fecha_inicio: this.dateInput(tournament.fecha_inicio),
      fecha_fin: tournament.fecha_fin ? this.dateInput(tournament.fecha_fin) : '',
      estado: tournament.estado
    });
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
    this.formError.set('');
  }

  protected submit(): void {
    this.formError.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    if (value.fecha_fin && value.fecha_fin < value.fecha_inicio) {
      this.formError.set('La fecha de finalización no puede ser anterior a la fecha de inicio.');
      return;
    }

    const payload: TournamentPayload = {
      nombre: value.nombre.trim(),
      deporte: value.deporte.trim(),
      formato: value.formato,
      fecha_inicio: value.fecha_inicio,
      fecha_fin: value.fecha_fin || null,
      estado: value.estado
    };
    const current = this.editing();
    this.saving.set(true);
    (current ? this.tournamentsApi.update(current.id, payload) : this.tournamentsApi.create(payload)).subscribe({
      next: () => {
        this.closeForm();
        this.loadTournaments();
      },
      error: (error: HttpErrorResponse) => {
        this.formError.set(error.error?.error ?? 'No fue posible guardar el torneo. Intenta nuevamente.');
        this.saving.set(false);
      },
      complete: () => this.saving.set(false)
    });
  }

  protected confirmDelete(tournament: Tournament): void {
    this.deletingTournament.set(tournament);
  }

  protected cancelDelete(): void {
    this.deletingTournament.set(null);
  }

  protected deleteTournament(): void {
    const tournament = this.deletingTournament();
    if (!tournament) return;
    this.deleting.set(true);
    this.error.set('');
    this.tournamentsApi.delete(tournament.id).subscribe({
      next: () => {
        this.deletingTournament.set(null);
        this.loadTournaments();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.error ?? 'No fue posible eliminar el torneo.');
        this.deleting.set(false);
      },
      complete: () => this.deleting.set(false)
    });
  }

  protected formatStatus(status: TournamentStatus): string {
    return { BORRADOR: 'BORRADOR', EN_CURSO: 'EN CURSO', FINALIZADO: 'FINALIZADO' }[status];
  }

  protected formatFormat(format: TournamentFormat): string {
    return { LIGA: 'Liga', ELIMINACION: 'Eliminación', MIXTO: 'Mixto' }[format];
  }

  protected formatDate(value: string | null): string {
    if (!value) return 'Sin fecha de cierre';
    return new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  private loadTournaments(): void {
    this.loading.set(true);
    this.error.set('');
    this.tournamentsApi.list().subscribe({
      next: ({ data }) => this.tournaments.set(data),
      error: (error: HttpErrorResponse) => this.error.set(error.error?.error ?? 'No fue posible cargar los torneos. Verifica que la API esté activa.'),
      complete: () => this.loading.set(false)
    });
  }

  private dateInput(value: string): string {
    return value.slice(0, 10);
  }
}
