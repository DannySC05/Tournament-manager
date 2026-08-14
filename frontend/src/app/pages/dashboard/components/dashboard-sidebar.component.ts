import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideCalendarDays, LucideHome, LucideLogOut, LucideMedal, LucideSettings, LucideTable2, LucideTrophy, LucideUsersRound } from '@lucide/angular';

@Component({
  selector: 'app-dashboard-sidebar',
  imports: [RouterLink, RouterLinkActive, LucideCalendarDays, LucideHome, LucideLogOut, LucideMedal, LucideSettings, LucideTable2, LucideTrophy, LucideUsersRound],
  template: `
    <aside class="sidebar" [class.open]="open()">
      <a class="brand" routerLink="/panel"><span class="brand-mark"><svg lucideTrophy width="18" height="18" /></span><span class="brand-copy">Administra <strong>torneos</strong></span></a>
      <nav aria-label="Navegacion principal">
        <a routerLink="/panel" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"><svg lucideHome width="19" height="19" /><span>Inicio</span></a>
        <a routerLink="/modulos/torneos" routerLinkActive="active"><svg lucideTrophy width="19" height="19" /><span>Torneos</span></a>
        <a routerLink="/modulos/equipos" routerLinkActive="active"><svg lucideUsersRound width="19" height="19" /><span>Equipos</span></a>
        <a routerLink="/modulos/partidos" routerLinkActive="active"><svg lucideCalendarDays width="19" height="19" /><span>Partidos</span></a>
        <a routerLink="/modulos/resultados" routerLinkActive="active"><svg lucideMedal width="19" height="19" /><span>Resultados</span></a>
        <a routerLink="/modulos/clasificacion" routerLinkActive="active"><svg lucideTable2 width="19" height="19" /><span>Clasificación</span></a>
      </nav>
      <div class="sidebar-footer">
        <a routerLink="/modulos/configuracion"><svg lucideSettings width="19" height="19" /><span>Configuracion</span></a>
        <button type="button" (click)="logout.emit()"><svg lucideLogOut width="19" height="19" /><span>Cerrar sesion</span></button>
      </div>
    </aside>
  `,
  styles: `
    .sidebar { background:#fff; border-right:1px solid #e3e8e5; display:flex; flex-direction:column; height:100vh; left:0; padding:1.35rem .85rem; position:fixed; top:0; width:244px; z-index:20; }
    .brand { align-items:center; color:#18201c; display:flex; font-size:1rem; font-weight:700; gap:.65rem; min-height:42px; padding:0 .45rem; text-decoration:none; } .brand strong { color:#179447; }
    .brand-mark { align-items:center; background:#179447; border-radius:9px; color:#fff; display:flex; height:30px; justify-content:center; width:30px; }
    nav { display:grid; gap:.28rem; margin-top:2.25rem; } nav a, .sidebar-footer a, .sidebar-footer button { align-items:center; background:transparent; border:0; border-radius:8px; color:#66706a; cursor:pointer; display:flex; font-size:.88rem; font-weight:600; gap:.78rem; min-height:42px; padding:0 .72rem; position:relative; text-align:left; text-decoration:none; width:100%; }
    nav a:hover, .sidebar-footer a:hover, .sidebar-footer button:hover { background:#f4f8f5; color:#0f6935; } nav a.active { background:#ebf7ee; color:#0f6935; } nav a.active::before { background:#179447; border-radius:0 4px 4px 0; content:''; height:23px; left:-.85rem; position:absolute; width:3px; }
    .sidebar-footer { border-top:1px solid #edf0ee; display:grid; gap:.25rem; margin-top:auto; padding-top:1rem; }
    @media (max-width: 1050px) and (min-width: 701px) { .sidebar { align-items:center; padding:.95rem .45rem; width:66px; } .brand-copy, nav span, .sidebar-footer span { display:none; } .brand { padding:0; } nav, .sidebar-footer { width:100%; } nav a, .sidebar-footer a, .sidebar-footer button { justify-content:center; padding:0; } nav a.active::before { left:-.45rem; } }
    @media (max-width: 700px) { .sidebar { box-shadow:0 20px 50px rgba(24,32,28,.16); transform:translateX(-100%); transition:transform .2s ease; width:244px; } .sidebar.open { transform:translateX(0); } }
  `
})
export class DashboardSidebarComponent {
  readonly open = input(false);
  readonly logout = output<void>();
}
