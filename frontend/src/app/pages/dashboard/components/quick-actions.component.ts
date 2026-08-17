import { Component, output } from '@angular/core';
import { LucideCalendarDays, LucideFileText, LucidePlus, LucideUsersRound, LucideZap } from '@lucide/angular';

@Component({
  selector: 'app-quick-actions',
  imports: [LucideCalendarDays, LucideFileText, LucidePlus, LucideUsersRound, LucideZap],
  template: `
    <section class="quick-actions"><h2><svg lucideZap width="16" height="16" /> Acciones rapidas</h2><div><button type="button" (click)="newTournament.emit()"><svg lucidePlus width="15" height="15" /> Nuevo torneo</button><button type="button" (click)="newTeam.emit()"><svg lucideUsersRound width="15" height="15" /> Nueva seleccion</button><button type="button" (click)="newMatch.emit()"><svg lucideCalendarDays width="15" height="15" /> Registrar partido</button><button type="button" (click)="generateReport.emit()"><svg lucideFileText width="15" height="15" /> Generar reporte</button></div></section>
  `,
  styles: `
    :host { display:block; } .quick-actions { align-items:center; background:rgba(6,20,15,.86); border:1px solid rgba(255,255,255,.09); border-radius:9px; box-shadow:0 10px 25px rgba(0,0,0,.16); box-sizing:border-box; display:grid; gap:.75rem; grid-template-columns:max-content minmax(0,1fr); min-height:61px; padding:.68rem .82rem; } h2 { align-items:center; color:#f4f6f5; display:flex; font-size:.69rem; gap:.38rem; margin:0; white-space:nowrap; } h2 svg { color:#22d34d; } div { display:flex; flex-wrap:wrap; gap:.4rem; min-width:0; } button { align-items:center; background:#0a1913; border:1px solid rgba(255,255,255,.12); border-radius:6px; color:#d9e2dc; cursor:pointer; display:inline-flex; flex:1 1 auto; font:700 .57rem inherit; gap:.3rem; justify-content:center; min-height:35px; padding:0 .5rem; white-space:nowrap; } button:hover { border-color:rgba(34,211,77,.5); color:#fff; } button svg { color:#22d34d; flex-shrink:0; } @media (max-width:900px) { .quick-actions { align-items:stretch; grid-template-columns:1fr; } button { flex:1 1 120px; } }
  `
})
export class QuickActionsComponent {
  readonly newTournament = output<void>();
  readonly newTeam = output<void>();
  readonly newMatch = output<void>();
  readonly generateReport = output<void>();
}
