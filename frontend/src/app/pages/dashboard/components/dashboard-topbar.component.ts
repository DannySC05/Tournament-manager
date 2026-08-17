import { Component, input, output, signal } from '@angular/core';
import { LucideBell, LucideCalendarDays, LucideCheck, LucideChevronDown, LucideMenu, LucidePlus, LucideTrophy, LucideUserRound, LucideX } from '@lucide/angular';

import { Tournament } from '../dashboard.models';

@Component({
  selector: 'app-dashboard-topbar',
  imports: [LucideBell, LucideCalendarDays, LucideCheck, LucideChevronDown, LucideMenu, LucidePlus, LucideTrophy, LucideUserRound, LucideX],
  template: `
    <header class="topbar">
      <button class="menu-button" type="button" [attr.aria-label]="menuOpen() ? 'Cerrar menu' : 'Abrir menu'" (click)="menuToggle.emit()">
        @if (menuOpen()) { <svg lucideX width="20" height="20" /> } @else { <svg lucideMenu width="20" height="20" /> }
      </button>
      <div class="greeting"><strong>Hola, {{ userName() }} <span aria-hidden="true">&#128075;</span></strong><p>Bienvenido al sistema de gestion de mundiales de selecciones.</p></div>
      @if (tournaments().length) {
        <div class="tournament-selector">
          <button class="selector-trigger" type="button" [attr.aria-expanded]="selectorOpen()" aria-haspopup="menu" (click)="toggleSelector()"><svg lucideTrophy width="16" height="16" /><span>{{ tournamentName() }}</span><svg class="chevron" lucideChevronDown width="15" height="15" /></button>
          @if (selectorOpen()) {
            <div class="selector-menu" role="menu" aria-label="Seleccionar mundial">
              <p>MUNDIAL ACTIVO</p>
              <div class="tournament-options">@for (tournament of tournaments(); track tournament.id) { <button type="button" role="menuitem" [class.selected]="tournament.id === selectedTournamentId()" (click)="selectTournament(tournament.id)"><span>{{ tournament.nombre }}</span>@if (tournament.id === selectedTournamentId()) { <svg lucideCheck width="15" height="15" /> }</button> }</div>
              @if (role() === 'ADMIN') { <button class="create-tournament" type="button" role="menuitem" (click)="createNewTournament()"><svg lucidePlus width="15" height="15" /> Crear nuevo torneo</button> }
            </div>
          }
        </div>
      }
      <div class="profile-area" aria-label="Acciones de usuario">
        <button type="button" title="Notificaciones" aria-label="Notificaciones"><svg lucideBell width="18" height="18" /><i aria-hidden="true"></i></button>
        <button type="button" title="Partidos" aria-label="Partidos"><svg lucideCalendarDays width="18" height="18" /></button>
        <button class="profile-button" type="button" title="Perfil" aria-label="Perfil"><svg lucideUserRound width="18" height="18" /><span>{{ initials() }}</span></button>
      </div>
    </header>
  `,
  styles: `
    .topbar { align-items:center; background:#020b08; border-bottom:1px solid rgba(255,255,255,.08); box-sizing:border-box; display:flex; gap:1rem; height:68px; padding:0 2rem; position:relative; z-index:10; } .greeting { margin-right:auto; min-width:0; } .greeting strong { color:#f4f6f5; font-size:1rem; } .greeting p { color:#9fa8a3; font-size:.74rem; margin:.27rem 0 0; } .tournament-selector { position:relative; } .selector-trigger { align-items:center; background:#07140f; border:1px solid rgba(34,211,77,.28); border-radius:7px; color:#dfe7e2; cursor:pointer; display:flex; font:700 .72rem inherit; gap:.42rem; max-width:235px; min-height:35px; padding:0 .55rem; } .selector-trigger:hover { border-color:rgba(34,211,77,.56); } .selector-trigger > svg:first-child { color:#e8b432; flex:0 0 auto; } .selector-trigger span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .selector-trigger .chevron { color:#8d9992; flex:0 0 auto; margin-left:.08rem; }
    .selector-menu { background:#0a1913; border:1px solid rgba(255,255,255,.12); border-radius:9px; box-shadow:0 16px 36px rgba(0,0,0,.38); min-width:260px; padding:.5rem; position:absolute; right:0; top:calc(100% + .5rem); z-index:30; } .selector-menu p { color:#85928a; font-size:.57rem; font-weight:850; letter-spacing:.1em; margin:.23rem .38rem .4rem; } .tournament-options { display:grid; max-height:190px; overflow:auto; } .tournament-options button, .create-tournament { align-items:center; background:transparent; border:0; border-radius:6px; color:#cbd4ce; cursor:pointer; display:flex; font:700 .68rem inherit; gap:.5rem; justify-content:space-between; min-height:34px; padding:0 .45rem; text-align:left; width:100%; } .tournament-options button:hover { background:rgba(34,211,77,.08); color:#f4f6f5; } .tournament-options button.selected { background:rgba(34,211,77,.12); color:#72e68c; } .tournament-options button svg { color:#22d34d; } .create-tournament { border-top:1px solid rgba(255,255,255,.1); color:#72e68c; margin-top:.42rem; padding-top:.42rem; } .create-tournament:hover { color:#d7f6dd; }
    .profile-area { display:flex; gap:.55rem; } .profile-area button, .menu-button { align-items:center; background:#07140f; border:1px solid rgba(255,255,255,.09); border-radius:50%; color:#aeb9b3; cursor:pointer; display:flex; height:35px; justify-content:center; padding:0; position:relative; width:35px; } .profile-area button:hover { border-color:rgba(34,211,77,.45); color:#f4f6f5; } .profile-area i { background:#e8b432; border:2px solid #020b08; border-radius:50%; height:7px; position:absolute; right:4px; top:4px; width:7px; } .profile-button { gap:.3rem; width:auto !important; padding:0 .46rem !important; } .profile-button span { color:#e8b432; font-size:.67rem; font-weight:850; } .menu-button { display:none; }
    @media (max-width:850px) { .topbar { gap:.6rem; padding:0 1.2rem; } .greeting p { display:none; } .selector-trigger { max-width:180px; } }
    @media (max-width:700px) { .topbar { height:60px; padding:0 1rem; } .menu-button { display:flex; flex:0 0 auto; } .greeting { display:none; } .tournament-selector { margin-right:auto; } .selector-trigger { max-width:185px; } .profile-area button:not(.profile-button) { display:none; } .selector-menu { left:0; right:auto; min-width:min(270px, calc(100vw - 2rem)); } }
  `
})
export class DashboardTopbarComponent {
  readonly tournamentName = input.required<string>();
  readonly tournaments = input<Tournament[]>([]);
  readonly selectedTournamentId = input<number | null>(null);
  readonly userName = input.required<string>();
  readonly role = input.required<'ADMIN' | 'CONSULTA'>();
  readonly menuOpen = input(false);
  readonly menuToggle = output<void>();
  readonly tournamentSelected = output<number>();
  readonly createTournament = output<void>();
  protected readonly selectorOpen = signal(false);

  protected toggleSelector(): void { this.selectorOpen.update((open) => !open); }
  protected selectTournament(tournamentId: number): void { this.selectorOpen.set(false); this.tournamentSelected.emit(tournamentId); }
  protected createNewTournament(): void { this.selectorOpen.set(false); this.createTournament.emit(); }

  protected initials(): string {
    return this.userName().split(' ').filter(Boolean).slice(0, 2).map((name) => name[0]).join('').toUpperCase() || 'U';
  }
}
