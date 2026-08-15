import { Component, output } from '@angular/core';
import { LucideCalendarDays, LucideFileText, LucidePlus, LucideUsersRound, LucideZap } from '@lucide/angular';

@Component({
  selector: 'app-quick-actions',
  imports: [LucideCalendarDays, LucideFileText, LucidePlus, LucideUsersRound, LucideZap],
  template: `
    <section class="quick-actions"><h2><svg lucideZap width="16" height="16" /> Acciones rapidas</h2><div><button type="button" (click)="newTournament.emit()"><svg lucidePlus width="15" height="15" /> Nuevo torneo</button><button type="button" (click)="newTeam.emit()"><svg lucideUsersRound width="15" height="15" /> Nueva seleccion</button><button type="button" (click)="newMatch.emit()"><svg lucideCalendarDays width="15" height="15" /> Registrar partido</button><button type="button" (click)="generateReport.emit()"><svg lucideFileText width="15" height="15" /> Generar reporte</button></div></section>
  `,
  styles: `
    .quick-actions { background:rgba(6,20,15,.86); border:1px solid rgba(255,255,255,.09); border-radius:14px; box-sizing:border-box; padding:1rem 1.1rem; } h2 { align-items:center; color:#f4f6f5; display:flex; font-size:.82rem; gap:.42rem; margin:0 0 .75rem; } h2 svg { color:#e8b432; } div { display:flex; flex-wrap:wrap; gap:.55rem; } button { align-items:center; background:#0a1913; border:1px solid rgba(255,255,255,.12); border-radius:7px; color:#d9e2dc; cursor:pointer; display:inline-flex; font:700 .7rem inherit; gap:.38rem; min-height:32px; padding:0 .6rem; } button:hover { border-color:rgba(34,211,77,.5); color:#fff; } button svg { color:#72e68c; }
  `
})
export class QuickActionsComponent {
  readonly newTournament = output<void>();
  readonly newTeam = output<void>();
  readonly newMatch = output<void>();
  readonly generateReport = output<void>();
}
