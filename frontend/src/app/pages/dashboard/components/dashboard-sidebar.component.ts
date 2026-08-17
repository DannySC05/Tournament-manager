import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideCalendarDays, LucideHome, LucideLogOut, LucideTable2, LucideTrophy, LucideUsersRound } from '@lucide/angular';

@Component({
  selector: 'app-dashboard-sidebar',
  imports: [RouterLink, RouterLinkActive, LucideCalendarDays, LucideHome, LucideLogOut, LucideTable2, LucideTrophy, LucideUsersRound],
  template: `
    <aside class="sidebar" [class.open]="open()">
      <a class="brand" routerLink="/panel" aria-label="Inicio del Mundial de Selecciones">
        <span class="brand-mark"><svg lucideTrophy width="19" height="19" /></span>
        <span class="brand-copy"><strong>MUNDIAL</strong><small>DE SELECCIONES</small></span>
      </a>

      <nav aria-label="Navegacion principal">
        <a routerLink="/panel" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"><svg lucideHome width="19" height="19" /><span>Inicio</span></a>
        <p class="nav-section">COMPETENCIAS</p>
        <a routerLink="/modulos/torneos" routerLinkActive="active"><svg lucideTrophy width="19" height="19" /><span>Torneos</span></a>
        <a routerLink="/modulos/equipos" routerLinkActive="active"><svg lucideUsersRound width="19" height="19" /><span>Selecciones</span></a>
        <a routerLink="/modulos/posiciones" routerLinkActive="active"><svg lucideTable2 width="19" height="19" /><span>Posiciones</span></a>
        <a routerLink="/modulos/partidos" routerLinkActive="active"><svg lucideCalendarDays width="19" height="19" /><span>Partidos</span></a>
      </nav>

      <div class="sidebar-footer">
        <div class="admin-summary"><span class="avatar">{{ initials() }}</span><span><strong>{{ userName() }}</strong><small><i aria-hidden="true"></i>{{ role() === 'ADMIN' ? 'Administrador' : 'Consulta' }}</small></span></div>
        <button type="button" (click)="logout.emit()"><svg lucideLogOut width="19" height="19" /><span>Cerrar sesion</span></button>
      </div>
    </aside>
  `,
  styles: `
    .sidebar { background:rgba(3,14,10,.98); border-right:1px solid rgba(255,255,255,.09); box-sizing:border-box; display:flex; flex-direction:column; height:100vh; left:0; padding:1.35rem .85rem; position:fixed; top:0; width:250px; z-index:20; }
    .brand { align-items:center; color:#f4f6f5; display:flex; gap:.68rem; min-height:45px; padding:0 .45rem; text-decoration:none; } .brand-mark { align-items:center; background:#e8b432; border-radius:9px; color:#061a10; display:flex; height:33px; justify-content:center; width:33px; } .brand-copy { display:grid; line-height:1; } .brand-copy strong { font-size:.78rem; letter-spacing:.12em; } .brand-copy small { color:#e8b432; font-size:.59rem; font-weight:800; letter-spacing:.1em; margin-top:.33rem; }
    nav { display:grid; gap:.25rem; margin-top:2.1rem; } nav a, .sidebar-footer button { align-items:center; background:transparent; border:0; border-radius:9px; color:#9fa8a3; cursor:pointer; display:flex; font:600 .86rem/1 inherit; gap:.78rem; min-height:42px; padding:0 .72rem; position:relative; text-align:left; text-decoration:none; width:100%; } nav a:hover, .sidebar-footer button:hover { background:rgba(34,211,77,.1); color:#f4f6f5; } nav a.active { background:#127a32; color:#fff; } .nav-section { color:#6e8277; font-size:.63rem; font-weight:850; letter-spacing:.11em; margin:1.15rem .72rem .35rem; }
    .sidebar-footer { border-top:1px solid rgba(255,255,255,.09); display:grid; gap:.75rem; margin-top:auto; padding:.95rem .35rem 0; } .admin-summary { align-items:center; display:flex; gap:.58rem; min-width:0; } .avatar { align-items:center; background:#163d29; border:1px solid rgba(232,180,50,.35); border-radius:50%; color:#e8b432; display:flex; flex:0 0 auto; font-size:.68rem; font-weight:850; height:29px; justify-content:center; width:29px; } .admin-summary span:last-child { display:grid; min-width:0; } .admin-summary strong { color:#e5eae7; font-size:.76rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .admin-summary small { align-items:center; color:#839088; display:flex; font-size:.66rem; gap:.32rem; margin-top:.16rem; } .admin-summary i { background:#22d34d; border-radius:50%; height:5px; width:5px; }
    @media (max-width:1050px) and (min-width:701px) { .sidebar { align-items:center; padding:.95rem .45rem; width:66px; } .brand-copy, nav span, .nav-section, .admin-summary span:last-child, .sidebar-footer button span { display:none; } .brand { padding:0; } nav, .sidebar-footer { width:100%; } nav a, .sidebar-footer button { justify-content:center; padding:0; } .sidebar-footer { padding-left:0; padding-right:0; } .admin-summary { justify-content:center; } }
    @media (max-width:700px) { .sidebar { box-shadow:20px 0 50px rgba(0,0,0,.35); transform:translateX(-100%); transition:transform .2s ease; } .sidebar.open { transform:translateX(0); } }
  `
})
export class DashboardSidebarComponent {
  readonly open = input(false);
  readonly userName = input('Usuario');
  readonly role = input<'ADMIN' | 'CONSULTA'>('CONSULTA');
  readonly logout = output<void>();

  protected initials(): string {
    return this.userName().split(' ').filter(Boolean).slice(0, 2).map((name) => name[0]).join('').toUpperCase() || 'U';
  }
}
