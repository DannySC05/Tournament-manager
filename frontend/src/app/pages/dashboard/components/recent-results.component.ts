import { Component, input, output } from '@angular/core';
import { LucideMedal } from '@lucide/angular';

import { Match } from '../dashboard.models';

@Component({
  selector: 'app-recent-results',
  imports: [LucideMedal],
  template: `
    <article class="panel-card"><header><h2><svg lucideMedal width="17" height="17" /> Resultados recientes</h2></header><div class="rows">@for (match of matches(); track match.id) { <button type="button" class="result-row" (click)="openResults.emit()"><span>{{ match.equipo_local }}</span><strong>{{ match.marcador_local }} - {{ match.marcador_visitante }}</strong><span>{{ match.equipo_visitante }}</span></button> } @empty { <p class="empty-copy">Aun no hay resultados.</p> }</div><button class="footer-link" type="button" (click)="openResults.emit()">Ver todos los resultados <span aria-hidden="true">&rarr;</span></button></article>
  `,
  styles: `
    :host { display:block; height:100%; } .panel-card { background:rgba(6,20,15,.86); border:1px solid rgba(255,255,255,.09); border-radius:9px; box-shadow:0 10px 25px rgba(0,0,0,.16); box-sizing:border-box; display:flex; flex-direction:column; height:100%; min-width:0; padding:.72rem .82rem; } header { margin-bottom:.32rem; } h2 { align-items:center; color:#f4f6f5; display:flex; font-size:.72rem; gap:.38rem; margin:0; } h2 svg { color:#22d34d; } .rows { display:grid; flex:1; } .result-row { align-items:center; background:transparent; border:0; border-top:1px solid rgba(255,255,255,.08); color:#d9e1dc; cursor:pointer; display:grid; font-size:.61rem; gap:.3rem; grid-template-columns:minmax(0,1fr) auto minmax(0,1fr); min-height:41px; padding:0; text-align:left; } .result-row span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .result-row:last-child span:last-child { text-align:right; } .result-row strong { color:#22d34d; font-size:.63rem; white-space:nowrap; } .footer-link { align-self:flex-start; background:transparent; border:0; color:#22d34d; cursor:pointer; font-size:.59rem; font-weight:800; margin-top:.55rem; padding:0; } .footer-link:hover { color:#d7f6dd; } .empty-copy { color:#849188; font-size:.67rem; margin:.8rem 0; }
  `
})
export class RecentResultsComponent {
  readonly matches = input.required<Match[]>();
  readonly openResults = output<void>();
}
