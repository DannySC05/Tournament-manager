import { Component, computed, input, signal, output } from '@angular/core';
import { LucideChevronDown, LucideTrophy } from '@lucide/angular';

import { StandingGroup } from '../../../core/standings/standing.models';

@Component({
  selector: 'app-dashboard-standings',
  imports: [LucideChevronDown, LucideTrophy],
  template: `
    <article class="panel-card">
      <header><h2><svg lucideTrophy width="17" height="17" /> Tabla de posiciones</h2>@if (groups().length > 1) { <label><span class="visually-hidden">Seleccionar grupo</span><select [value]="activeGroup()" (change)="selectGroup($any($event.target).value)">@for (group of groups(); track group.grupo) { <option [value]="group.grupo">{{ group.grupo }}</option> }</select><svg lucideChevronDown width="14" height="14" /></label> }</header>
      @if (rows().length) { <div class="table-wrap"><table><thead><tr><th>#</th><th>Seleccion</th><th>PJ</th><th>DG</th><th>PTS</th></tr></thead><tbody>@for (row of rows(); track row.equipo_id) { <tr><td>{{ row.posicion }}</td><td>{{ row.equipo_nombre }}</td><td>{{ row.partidos_jugados }}</td><td [class.positive]="row.diferencia_goles > 0">{{ signed(row.diferencia_goles) }}</td><td><strong>{{ row.puntos }}</strong></td></tr> }</tbody></table></div> } @else { <p class="empty-copy">La tabla aparecera cuando existan resultados finalizados.</p> }
      <button class="footer-link" type="button" (click)="openFullTable.emit()">Ver tabla completa <span aria-hidden="true">→</span></button>
    </article>
  `,
  styles: `
    .panel-card { background:rgba(6,20,15,.86); border:1px solid rgba(255,255,255,.09); border-radius:14px; box-sizing:border-box; min-width:0; padding:1.05rem 1.1rem; } header { align-items:center; display:flex; gap:.45rem; justify-content:space-between; margin-bottom:.65rem; } h2 { align-items:center; color:#f4f6f5; display:flex; font-size:.88rem; gap:.45rem; margin:0; white-space:nowrap; } h2 svg { color:#e8b432; } label { align-items:center; background:#0a1913; border:1px solid rgba(255,255,255,.11); border-radius:7px; color:#b7c1bb; display:flex; padding:0 .35rem .0rem .55rem; position:relative; } select { appearance:none; background:transparent; border:0; color:#b7c1bb; cursor:pointer; font:700 .65rem inherit; outline:0; padding:0 .25rem 0 0; } label svg { color:#aeb9b3; pointer-events:none; } .table-wrap { overflow:auto; } table { border-collapse:collapse; min-width:100%; width:100%; } th { border-bottom:1px solid rgba(255,255,255,.1); color:#829087; font-size:.61rem; font-weight:850; padding:.55rem .2rem; text-align:center; } th:nth-child(2), td:nth-child(2) { text-align:left; } td { border-bottom:1px solid rgba(255,255,255,.07); color:#cbd4ce; font-size:.67rem; padding:.56rem .2rem; text-align:center; white-space:nowrap; } td:first-child { color:#e8b432; font-weight:800; } td:nth-child(2) { max-width:106px; overflow:hidden; text-overflow:ellipsis; } td.positive { color:#72e68c; } td strong { color:#f4f6f5; } .footer-link { background:transparent; border:0; color:#72e68c; cursor:pointer; font-size:.68rem; font-weight:800; margin-top:.8rem; padding:0; } .footer-link:hover { color:#d7f6dd; } .empty-copy { color:#849188; font-size:.72rem; line-height:1.45; margin:1.15rem 0; } .visually-hidden { clip:rect(0 0 0 0); clip-path:inset(50%); height:1px; overflow:hidden; position:absolute; white-space:nowrap; width:1px; }
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
