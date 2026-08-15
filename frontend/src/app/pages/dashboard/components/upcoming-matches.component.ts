import { Component, input, output } from '@angular/core';
import { LucideCalendarDays, LucideChevronRight } from '@lucide/angular';

import { Match } from '../dashboard.models';

@Component({
  selector: 'app-upcoming-matches',
  imports: [LucideCalendarDays, LucideChevronRight],
  template: `
    <article class="panel-card">
      <header><h2><svg lucideCalendarDays width="17" height="17" /> Proximos partidos</h2><button type="button" (click)="openCalendar.emit()">Ver calendario <span aria-hidden="true">&rarr;</span></button></header>
      <div class="rows">@for (match of matches(); track match.id) { <button class="match-row" type="button" (click)="openCalendar.emit()"><div><strong>{{ match.equipo_local }}</strong><b>VS</b><strong>{{ match.equipo_visitante }}</strong></div><small>{{ matchDay(match.fecha) }} <i>&bull;</i> {{ matchTime(match.fecha) }} <i>&bull;</i> {{ match.sede }}</small><svg lucideChevronRight width="16" height="16" /></button> } @empty { <p class="empty-copy">No hay partidos programados.</p> }</div>
      <button class="footer-link" type="button" (click)="openCalendar.emit()">Ver todos los partidos <span aria-hidden="true">&rarr;</span></button>
    </article>
  `,
  styles: `
    :host { display:block; height:100%; } .panel-card { background:rgba(6,20,15,.86); border:1px solid rgba(255,255,255,.09); border-radius:9px; box-shadow:0 10px 25px rgba(0,0,0,.16); box-sizing:border-box; display:flex; flex-direction:column; height:100%; min-width:0; padding:.72rem .82rem; } header { align-items:center; display:flex; justify-content:space-between; margin-bottom:.32rem; } h2 { align-items:center; color:#f4f6f5; display:flex; font-size:.72rem; gap:.38rem; margin:0; } h2 svg { color:#22d34d; } header button { background:transparent; border:0; color:#22d34d; cursor:pointer; font-size:.59rem; font-weight:800; padding:0; } header button:hover, .footer-link:hover { color:#d7f6dd; } .rows { display:grid; flex:1; } .match-row { background:transparent; border:0; border-top:1px solid rgba(255,255,255,.08); color:#dbe2de; cursor:pointer; display:grid; gap:.22rem; grid-template-columns:minmax(0,1fr) auto; min-height:45px; padding:.38rem 0; text-align:left; } .match-row:hover strong { color:#72e68c; } .match-row div { display:flex; gap:.35rem; min-width:0; } .match-row strong { font-size:.65rem; overflow:hidden; text-overflow:ellipsis; transition:color .15s; white-space:nowrap; } .match-row b { color:#22d34d; font-size:.54rem; margin:0 .05rem; } .match-row small { color:#819087; font-size:.56rem; grid-column:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .match-row i { color:#e8b432; font-style:normal; margin:0 .12rem; } .match-row svg { align-self:center; color:#829087; grid-column:2; grid-row:1 / 3; } .footer-link { align-self:flex-start; background:transparent; border:0; color:#22d34d; cursor:pointer; font-size:.59rem; font-weight:800; margin-top:.55rem; padding:0; } .empty-copy { color:#849188; font-size:.7rem; margin:.8rem 0 .4rem; }
  `
})
export class UpcomingMatchesComponent {
  readonly matches = input.required<Match[]>();
  readonly openCalendar = output<void>();

  protected matchDay(value: string): string { return new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'short' }).format(new Date(value)); }
  protected matchTime(value: string): string { return new Intl.DateTimeFormat('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value)); }
}
