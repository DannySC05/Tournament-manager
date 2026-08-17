import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucidePencil, LucidePlus, LucideSearch, LucideTrash2, LucideTrophy, LucideX } from '@lucide/angular';

import { AuthService } from '../../core/auth/auth.service';
import { TeamService } from '../../core/teams/team.service';
import { Tournament, TournamentFormat, TournamentPayload, TournamentStatus } from '../../core/tournaments/tournament.models';
import { TournamentService } from '../../core/tournaments/tournament.service';
import { DashboardSidebarComponent } from '../dashboard/components/dashboard-sidebar.component';
import { DashboardTopbarComponent } from '../dashboard/components/dashboard-topbar.component';
import { StatusBadgeComponent } from '../dashboard/components/status-badge.component';

const PARTICIPANT_OPTIONS = [2, 4, 8, 10, 12, 16, 24, 32, 48] as const;

@Component({
  selector: 'app-tournaments-page',
  imports: [ReactiveFormsModule, DashboardSidebarComponent, DashboardTopbarComponent, StatusBadgeComponent, LucidePencil, LucidePlus, LucideSearch, LucideTrash2, LucideTrophy, LucideX],
  templateUrl: './tournaments.page.html',
  styleUrl: './tournaments.page.scss'
})
export class TournamentsPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly tournamentsApi = inject(TournamentService);
  private readonly teamsApi = inject(TeamService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly tournaments = signal<Tournament[]>([]);
  protected readonly winnerCandidates = signal<{ id: number; nombre: string }[]>([]);
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
  protected readonly selectedFormat = signal<TournamentFormat>('LIGA');
  protected readonly participantCount = signal<number>(32);
  protected readonly groupCount = signal<number>(8);
  protected readonly participantOptions = PARTICIPANT_OPTIONS;
  protected readonly requiresGroups = computed(() => this.selectedFormat() !== 'ELIMINACION');
  protected readonly groupOptions = computed(() => this.requiresGroups()
    ? Array.from({ length: this.participantCount() / 2 }, (_, index) => index + 1).filter((groups) => this.participantCount() % groups === 0)
    : []);
  protected readonly countriesPerGroup = computed(() => {
    const groups = this.groupCount();
    return groups > 0 ? this.participantCount() / groups : 0;
  });
  protected readonly visibleTournaments = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();
    if (!query) return this.tournaments();
    return this.tournaments().filter((tournament) => [tournament.nombre, tournament.formato, tournament.estado]
      .some((value) => value.toLocaleLowerCase().includes(query)));
  });

  protected readonly form = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    formato: ['LIGA' as TournamentFormat, Validators.required],
    participantes_count: [32, Validators.required],
    cantidad_grupos: [8, Validators.required],
    fecha_inicio: ['', Validators.required],
    fecha_fin: ['', Validators.required],
    sede: ['', [Validators.maxLength(100)]],
    estado: ['BORRADOR' as TournamentStatus, Validators.required],
    ganador_equipo_id: [0]
  });

  ngOnInit(): void { this.loadTournaments(); }
  protected setQuery(value: string): void { this.query.set(value); }

  protected openCreate(): void {
    this.editing.set(null);
    this.winnerCandidates.set([]);
    this.formOpen.set(true);
    this.formError.set('');
    this.form.reset({ nombre: '', formato: 'LIGA', participantes_count: 32, cantidad_grupos: 8, fecha_inicio: '', fecha_fin: '', sede: '', estado: 'BORRADOR', ganador_equipo_id: 0 });
    this.selectedFormat.set('LIGA');
    this.participantCount.set(32);
    this.groupCount.set(8);
    this.normalizeGroupCount();
  }

  protected openEdit(tournament: Tournament): void {
    this.editing.set(tournament);
    this.formOpen.set(true);
    this.formError.set('');
    this.form.reset({
      nombre: tournament.nombre,
      formato: tournament.formato,
      participantes_count: tournament.participantes_count,
      cantidad_grupos: tournament.cantidad_grupos ?? 1,
      fecha_inicio: this.dateInput(tournament.fecha_inicio),
      fecha_fin: tournament.fecha_fin ? this.dateInput(tournament.fecha_fin) : '',
      sede: tournament.sede ?? '',
      estado: tournament.estado,
      ganador_equipo_id: tournament.ganador_equipo_id ?? 0
    });
    this.selectedFormat.set(tournament.formato);
    this.participantCount.set(tournament.participantes_count);
    this.groupCount.set(tournament.cantidad_grupos ?? 1);
    this.normalizeGroupCount();
    this.teamsApi.list(tournament.id).subscribe({
      next: ({ data }) => this.winnerCandidates.set(data.map(({ id, nombre }) => ({ id, nombre }))),
      error: () => this.winnerCandidates.set([])
    });
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
    this.winnerCandidates.set([]);
    this.formError.set('');
  }

  protected onFormatChange(value: string): void {
    this.selectedFormat.set(value as TournamentFormat);
    this.form.controls.formato.setValue(value as TournamentFormat);
    this.normalizeGroupCount();
  }

  protected onParticipantChange(value: string): void {
    const participants = Number(value);
    if (!PARTICIPANT_OPTIONS.includes(participants as typeof PARTICIPANT_OPTIONS[number])) return;
    this.participantCount.set(participants);
    this.form.controls.participantes_count.setValue(participants);
    this.normalizeGroupCount();
  }

  protected onGroupChange(value: string): void {
    const groups = Number(value);
    this.groupCount.set(groups);
    this.form.controls.cantidad_grupos.setValue(groups);
  }
  protected onStatusChange(value: string): void { this.form.controls.estado.setValue(value as TournamentStatus); }
  protected isFinalized(): boolean { return this.form.controls.estado.value === 'FINALIZADO'; }

  protected submit(): void {
    this.formError.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    if (value.fecha_fin < value.fecha_inicio) {
      this.formError.set('La fecha de finalizacion no puede ser anterior a la fecha de inicio.');
      return;
    }
    if (value.formato !== 'ELIMINACION' && !this.groupOptions().includes(value.cantidad_grupos)) {
      this.formError.set('Selecciona una cantidad de grupos valida para el numero de paises participantes.');
      return;
    }
    if (value.estado === 'FINALIZADO' && !value.ganador_equipo_id) {
      this.formError.set('Selecciona el ganador antes de finalizar el torneo.');
      return;
    }

    const current = this.editing();
    const payload: TournamentPayload = {
      nombre: value.nombre.trim(),
      formato: value.formato,
      participantes_count: value.participantes_count,
      cantidad_grupos: value.formato === 'ELIMINACION' ? null : value.cantidad_grupos,
      fecha_inicio: value.fecha_inicio,
      fecha_fin: value.fecha_fin,
      sede: value.sede?.trim() || null,
      ...(current ? { estado: value.estado, ganador_equipo_id: value.estado === 'FINALIZADO' ? value.ganador_equipo_id : null } : {})
    };
    this.saving.set(true);
    (current ? this.tournamentsApi.update(current.id, payload) : this.tournamentsApi.create(payload)).subscribe({
      next: () => { this.closeForm(); this.loadTournaments(); },
      error: (error: HttpErrorResponse) => { this.formError.set(error.error?.error ?? 'No fue posible guardar el torneo. Intenta nuevamente.'); this.saving.set(false); },
      complete: () => this.saving.set(false)
    });
  }

  protected confirmDelete(tournament: Tournament): void { this.deletingTournament.set(tournament); }
  protected cancelDelete(): void { this.deletingTournament.set(null); }
  protected deleteTournament(): void {
    const tournament = this.deletingTournament();
    if (!tournament) return;
    this.deleting.set(true);
    this.error.set('');
    this.tournamentsApi.delete(tournament.id).subscribe({
      next: () => { this.deletingTournament.set(null); this.loadTournaments(); },
      error: (error: HttpErrorResponse) => { this.error.set(error.error?.error ?? 'No fue posible eliminar el torneo.'); this.deleting.set(false); },
      complete: () => this.deleting.set(false)
    });
  }

  protected formatStatus(status: TournamentStatus): string { return { BORRADOR: 'BORRADOR', EN_CURSO: 'EN CURSO', FINALIZADO: 'FINALIZADO' }[status]; }
  protected formatFormat(format: TournamentFormat): string { return { LIGA: 'Liga', ELIMINACION: 'Eliminatoria', MIXTO: 'Mixta' }[format]; }
  protected formatDate(value: string | null): string { return value ? new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Sin fecha de cierre'; }
  protected toggleMenu(): void { this.menuOpen.update((open) => !open); }
  protected closeMenu(): void { this.menuOpen.set(false); }

  private normalizeGroupCount(): void {
    if (!this.requiresGroups()) {
      this.form.controls.cantidad_grupos.clearValidators();
      this.form.controls.cantidad_grupos.setValue(1);
      this.groupCount.set(1);
      this.form.controls.cantidad_grupos.updateValueAndValidity();
      return;
    }
    this.form.controls.cantidad_grupos.setValidators(Validators.required);
    const current = Number(this.form.controls.cantidad_grupos.value);
    if (!this.groupOptions().includes(current)) this.form.controls.cantidad_grupos.setValue(this.groupOptions()[0]);
    this.groupCount.set(Number(this.form.controls.cantidad_grupos.value));
    this.form.controls.cantidad_grupos.updateValueAndValidity();
  }

  private loadTournaments(): void {
    this.loading.set(true);
    this.error.set('');
    this.tournamentsApi.list().subscribe({
      next: ({ data }) => this.tournaments.set(data),
      error: (error: HttpErrorResponse) => this.error.set(error.error?.error ?? 'No fue posible cargar los torneos. Verifica que la API este activa.'),
      complete: () => this.loading.set(false)
    });
  }

  private dateInput(value: string): string { return value.slice(0, 10); }
}
