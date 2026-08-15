import { Component, input, output } from '@angular/core';
import { LucideBell, LucideCalendarDays, LucideMenu, LucideUserRound, LucideX } from '@lucide/angular';

@Component({
  selector: 'app-dashboard-topbar',
  imports: [LucideBell, LucideCalendarDays, LucideMenu, LucideUserRound, LucideX],
  template: `
    <header class="topbar">
      <button class="menu-button" type="button" [attr.aria-label]="menuOpen() ? 'Cerrar menu' : 'Abrir menu'" (click)="menuToggle.emit()">
        @if (menuOpen()) { <svg lucideX width="20" height="20" /> } @else { <svg lucideMenu width="20" height="20" /> }
      </button>
      <div class="greeting"><strong>Hola, {{ userName() }} <span aria-hidden="true">&#128075;</span></strong><p>Bienvenido al sistema de gestion de mundiales de selecciones.</p></div>
      <div class="profile-area" aria-label="Acciones de usuario">
        <button type="button" title="Notificaciones" aria-label="Notificaciones"><svg lucideBell width="18" height="18" /><i aria-hidden="true"></i></button>
        <button type="button" title="Calendario" aria-label="Calendario"><svg lucideCalendarDays width="18" height="18" /></button>
        <button class="profile-button" type="button" title="Perfil" aria-label="Perfil"><svg lucideUserRound width="18" height="18" /><span>{{ initials() }}</span></button>
      </div>
    </header>
  `,
  styles: `
    .topbar { align-items:center; background:#020b08; border-bottom:1px solid rgba(255,255,255,.08); box-sizing:border-box; display:flex; height:68px; justify-content:space-between; padding:0 2rem; } .greeting strong { color:#f4f6f5; font-size:1rem; } .greeting p { color:#9fa8a3; font-size:.74rem; margin:.27rem 0 0; } .profile-area { display:flex; gap:.55rem; } .profile-area button, .menu-button { align-items:center; background:#07140f; border:1px solid rgba(255,255,255,.09); border-radius:50%; color:#aeb9b3; cursor:pointer; display:flex; height:35px; justify-content:center; padding:0; position:relative; width:35px; } .profile-area button:hover { border-color:rgba(34,211,77,.45); color:#f4f6f5; } .profile-area i { background:#e8b432; border:2px solid #020b08; border-radius:50%; height:7px; position:absolute; right:4px; top:4px; width:7px; } .profile-button { gap:.3rem; width:auto !important; padding:0 .46rem !important; } .profile-button span { color:#e8b432; font-size:.67rem; font-weight:850; } .menu-button { display:none; }
    @media (max-width:700px) { .topbar { height:60px; padding:0 1rem; } .menu-button { display:flex; margin-right:.7rem; } .greeting { margin-right:auto; } .greeting p { display:none; } .profile-area button:not(.profile-button) { display:none; } }
  `
})
export class DashboardTopbarComponent {
  readonly tournamentName = input.required<string>();
  readonly userName = input.required<string>();
  readonly role = input.required<'ADMIN' | 'CONSULTA'>();
  readonly menuOpen = input(false);
  readonly menuToggle = output<void>();

  protected initials(): string {
    return this.userName().split(' ').filter(Boolean).slice(0, 2).map((name) => name[0]).join('').toUpperCase() || 'U';
  }
}
