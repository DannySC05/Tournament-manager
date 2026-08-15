import { Component, input, output } from '@angular/core';
import { LucideMedal } from '@lucide/angular';

import { Match } from '../dashboard.models';

@Component({
  selector: 'app-recent-results',
  imports: [LucideMedal],
  template: `
    <article class="panel-card"><header><h2><svg lucideMedal width="17" height="17" /> Resultados recientes</h2></header><div class="rows">@for (match of matches(); track match.id) { <button type="button" class="result-row" (click)="openResults.emit()"><span>{{ match.equipo_local }}</span><strong>{{ match.marcador_local }} - {{ match.marcador_visitante }}</strong><span>{{ match.equipo_visitante }}</span></button> } @empty { <p class="empty-copy">Aun no hay resultados.</p> }</div><button class="footer-link" type="button" (click)="openResults.emit()">Ver todos los resultados <span aria-hidden="true">→</span></button></article>
  `,
  styles: `
    .panel-card { background:rgba(6,20,15,.86); border:1px solid rgba(255,255,255,.09); border-radius:14px; box-sizing:border-box; min-width:0; padding:1.05rem 1.1rem; } header { margin-bottom:.55rem; } h2 { align-items:center; color:#f4f6f5; display:flex; font-size:.88rem; gap:.45rem; margin:0; } h2 svg { color:#e8b432; } .rows { display:grid; } .result-row { align-items:center; background:transparent; border:0; border-top:1px solid rgba(255,255,255,.08); color:#d9e1dc; cursor:pointer; display:grid; font-size:.7rem; gap:.4rem; grid-template-columns:minmax(0,1fr) auto minmax(0,1fr); min-height:51px; padding:0; text-align:left; } .result-row span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .result-row:last-child span:last-child { text-align:right; } .result-row strong { color:#72e68c; font-size:.72rem; white-space:nowrap; } .footer-link { background:transparent; border:0; color:#72e68c; cursor:pointer; font-size:.68rem; font-weight:800; margin-top:.8rem; padding:0; } .footer-link:hover { color:#d7f6dd; } .empty-copy { color:#849188; font-size:.72rem; margin:1rem 0; }
  `
})
export class RecentResultsComponent {
  readonly matches = input.required<Match[]>();
  readonly openResults = output<void>();
}
