import { Component, computed, input, output, signal } from '@angular/core';
import { LucideChevronDown, LucideTrophy } from '@lucide/angular';

import { StandingGroup } from '../../../core/standings/standing.models';

@Component({
  selector: 'app-dashboard-standings',
  imports: [LucideChevronDown, LucideTrophy],
  template: `
    <article class="panel-card">
      <header><h2><svg lucideTrophy width="17" height="17" /> Tabla de posiciones</h2>@if (groups().length > 1) { <label><span class="visually-hidden">Seleccionar grupo</span><select [value]="activeGroup()" (change)="selectGroup($any($event.target).value)">@for (group of groups(); track group.grupo) { <option [value]="group.grupo">{{ group.grupo }}</option> }</select><svg lucideChevronDown width="14" height="14" /></label> }</header>
      @if (rows().length) { <div class="table-wrap"><table><thead><tr><th>#</th><th>Seleccion</th><th>PJ</th><th>DG</th><th>PTS</th></tr></thead><tbody>@for (row of rows(); track row.equipo_id) { <tr><td>{{ row.posicion }}</td><td>{{ row.equipo_nombre }}</td><td>{{ row.partidos_jugados }}</td><td [class.positive]="row.diferencia_goles > 0">{{ signed(row.diferencia_goles) }}</td><td><strong>{{ row.puntos }}</strong></td></tr> }</tbody></table></div> } @else { <p class="empty-copy">La tabla aparecera cuando existan resultados finalizados.</p> }
      <button class="footer-link" type="button" (click)="openFullTable.emit()">Ver tabla completa <span aria-hidden="true">&rarr;</span></button>
    </article>
  `,
  styles: `
    :host { display:block; height:100%; } .panel-card { background:rgba(6,20,15,.86); border:1px solid rgba(255,255,255,.09); border-radius:9px; box-shadow:0 10px 25px rgba(0,0,0,.16); box-sizing:border-box; display:flex; flex-direction:column; height:100%; min-width:0; padding:.72rem .82rem; } header { align-items:center; display:flex; gap:.4rem; justify-content:space-between; margin-bottom:.35rem; } h2 { align-items:center; color:#f4f6f5; display:flex; font-size:.72rem; gap:.38rem; margin:0; white-space:nowrap; } h2 svg { color:#e8b432; } label { align-items:center; background:#0a1913; border:1px solid rgba(255,255,255,.11); border-radius:5px; color:#b7c1bb; display:flex; padding:0 .22rem 0 .38rem; position:relative; } select { appearance:none; background:transparent; border:0; color:#b7c1bb; cursor:pointer; font:700 .57rem inherit; outline:0; padding:0 .15rem 0 0; } label svg { color:#aeb9b3; pointer-events:none; } .table-wrap { flex:1; overflow:auto; } table { border-collapse:collapse; min-width:100%; width:100%; } th { border-bottom:1px solid rgba(255,255,255,.1); color:#829087; font-size:.53rem; font-weight:850; padding:.38rem .16rem; text-align:center; } th:nth-child(2), td:nth-child(2) { text-align:left; } td { border-bottom:1px solid rgba(255,255,255,.07); color:#cbd4ce; font-size:.57rem; padding:.39rem .16rem; text-align:center; white-space:nowrap; } td:first-child { color:#e8b432; font-weight:800; } td:nth-child(2) { max-width:92px; overflow:hidden; text-overflow:ellipsis; } td.positive { color:#72e68c; } td strong { color:#f4f6f5; } .footer-link { align-self:flex-start; background:transparent; border:0; color:#22d34d; cursor:pointer; font-size:.59rem; font-weight:800; margin-top:.55rem; padding:0; } .footer-link:hover { color:#d7f6dd; } .empty-copy { color:#849188; font-size:.67rem; line-height:1.4; margin:.9rem 0; } .visually-hidden { clip:rect(0 0 0 0); clip-path:inset(50%); height:1px; overflow:hidden; position:absolute; white-space:nowrap; width:1px; }
  `
})
export class DashboardStandingsComponent {
  readonly groups = input.required<StandingGroup[]>();
  readonly openFullTable = output<void>();
  private readonly selectedGroup = signal('');
  protected readonly activeGroup = computed(() => this.groups().some((group) => group.grupo === this.selectedGroup()) ? this.selectedGroup() : (this.groups()[0]?.grupo ?? ''));
  protected readonly rows = computed(() => this.groups().find((group) => group.grupo === this.activeGroup())?.clasificacion ?? []);

  protected selectGroup(group: string): void { this.selectedGroup.set(group); }
  protected signed(value: number): string { return value > 0 ? `+${value}` : String(value); }
}
