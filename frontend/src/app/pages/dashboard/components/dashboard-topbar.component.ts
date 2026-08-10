import { Component, input, output } from '@angular/core';
import { LucideBell, LucideChevronDown, LucideMenu, LucideX } from '@lucide/angular';

@Component({
  selector: 'app-dashboard-topbar',
  imports: [LucideBell, LucideChevronDown, LucideMenu, LucideX],
  template: `
    <header class="topbar">
      <button class="menu-button" type="button" [attr.aria-label]="menuOpen() ? 'Cerrar menu' : 'Abrir menu'" (click)="menuToggle.emit()">@if (menuOpen()) { <svg lucideX width="21" height="21" /> } @else { <svg lucideMenu width="21" height="21" /> }</button>
      <button class="tournament-switcher" type="button">{{ tournamentName() }}<svg lucideChevronDown width="17" height="17" /></button>
      <div class="profile-area"><button class="notification-button" type="button" aria-label="Notificaciones"><svg lucideBell width="19" height="19" /><span></span></button><div class="role">{{ role() === 'ADMIN' ? 'Administrador' : 'Consulta' }}</div><div class="identity"><span>{{ userName() }}</span><small>{{ role() === 'ADMIN' ? 'Administrador' : 'Consulta' }}</small></div><span class="avatar">{{ initials() }}</span></div>
    </header>
  `,
  styles: `
    .topbar { align-items:center; background:#fff; border-bottom:1px solid #e3e8e5; display:flex; height:68px; justify-content:space-between; padding:0 2rem; }
    button { font:inherit; } .tournament-switcher { align-items:center; background:#f7f9f8; border:1px solid #e8ecea; border-radius:8px; color:#18201c; cursor:pointer; display:inline-flex; font-size:.88rem; font-weight:700; gap:.42rem; min-height:37px; padding:0 .7rem; }
    .profile-area { align-items:center; display:flex; gap:.8rem; } .notification-button, .menu-button { align-items:center; background:transparent; border:0; color:#4e5d54; cursor:pointer; display:flex; height:36px; justify-content:center; padding:0; position:relative; width:36px; } .notification-button span { background:#179447; border:2px solid #fff; border-radius:50%; height:8px; position:absolute; right:5px; top:5px; width:8px; }
    .identity { display:grid; text-align:right; } .identity span { color:#18201c; font-size:.82rem; font-weight:700; } .identity small { color:#7a847e; font-size:.7rem; margin-top:.12rem; } .role { background:#edf8f0; border-radius:99px; color:#0f6935; font-size:.68rem; font-weight:800; padding:.35rem .54rem; } .avatar { align-items:center; background:#d9eadf; border-radius:50%; color:#0f6935; display:flex; font-size:.75rem; font-weight:800; height:34px; justify-content:center; width:34px; }
    .menu-button { display:none; } @media (max-width:700px) { .topbar { height:60px; padding:0 1rem; } .menu-button { display:flex; } .notification-button, .identity, .role { display:none; } .tournament-switcher { background:transparent; border:0; margin-right:auto; padding-left:.4rem; } }
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
