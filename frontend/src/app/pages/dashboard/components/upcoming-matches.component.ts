import { Component, input, output } from '@angular/core';
import { LucideCalendarDays, LucideChevronRight } from '@lucide/angular';

import { Match } from '../dashboard.models';

@Component({
  selector: 'app-upcoming-matches',
  imports: [LucideCalendarDays, LucideChevronRight],
  template: `
    <article class="panel-card">
      <header><h2><svg lucideCalendarDays width="17" height="17" /> Proximos partidos</h2><button type="button" (click)="openCalendar.emit()">Ver calendario <span aria-hidden="true">→</span></button></header>
      <div class="rows">@for (match of matches(); track match.id) { <button class="match-row" type="button" (click)="openCalendar.emit()"><div><strong>{{ match.equipo_local }}</strong><b>VS</b><strong>{{ match.equipo_visitante }}</strong></div><small>{{ matchDay(match.fecha) }} <i>•</i> {{ matchTime(match.fecha) }} <i>•</i> {{ match.sede }}</small><svg lucideChevronRight width="16" height="16" /></button> } @empty { <p class="empty-copy">No hay partidos programados.</p> }</div>
    </article>
  `,
  styles: `
    .panel-card { background:rgba(6,20,15,.86); border:1px solid rgba(255,255,255,.09); border-radius:14px; box-sizing:border-box; min-width:0; padding:1.05rem 1.1rem; } header { align-items:center; display:flex; justify-content:space-between; margin-bottom:.55rem; } h2 { align-items:center; color:#f4f6f5; display:flex; font-size:.88rem; gap:.45rem; margin:0; } h2 svg { color:#e8b432; } header button { background:transparent; border:0; color:#72e68c; cursor:pointer; font-size:.68rem; font-weight:800; padding:0; } header button:hover { color:#d7f6dd; } .rows { display:grid; } .match-row { background:transparent; border:0; border-top:1px solid rgba(255,255,255,.08); color:#dbe2de; cursor:pointer; display:grid; gap:.42rem; grid-template-columns:minmax(0,1fr) auto; min-height:65px; padding:.68rem 0; text-align:left; } .match-row:hover strong { color:#72e68c; } .match-row div { display:flex; gap:.42rem; min-width:0; } .match-row strong { font-size:.75rem; overflow:hidden; text-overflow:ellipsis; transition:color .15s; white-space:nowrap; } .match-row b { color:#22d34d; font-size:.62rem; margin:0 .05rem; } .match-row small { color:#819087; font-size:.65rem; grid-column:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .match-row i { color:#e8b432; font-style:normal; margin:0 .15rem; } .match-row svg { align-self:center; color:#829087; grid-column:2; grid-row:1 / 3; } .empty-copy { color:#849188; font-size:.75rem; margin:.9rem 0 .5rem; }
  `
})
export class UpcomingMatchesComponent {
  readonly matches = input.required<Match[]>();
  readonly openCalendar = output<void>();

  protected matchDay(value: string): string { return new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'short' }).format(new Date(value)); }
  protected matchTime(value: string): string { return new Intl.DateTimeFormat('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value)); }
}
