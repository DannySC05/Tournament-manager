import { Component, input } from '@angular/core';
import { LucideCalendarDays, LucideClock, LucideImage, LucideMapPin } from '@lucide/angular';

import { Tournament } from '../dashboard.models';
import { StatusBadgeComponent } from './status-badge.component';

@Component({
  selector: 'app-world-cup-banner',
  imports: [LucideCalendarDays, LucideClock, LucideImage, LucideMapPin, StatusBadgeComponent],
  template: `
    <section class="world-banner" aria-labelledby="world-name">
      <div class="image-placeholder"><svg lucideImage width="28" height="28" /><span>Imagen de<br />la copa</span></div>
      <div class="world-main">
        <p class="eyebrow">MUNDIAL DE SELECCIONES</p>
        <h1 id="world-name">{{ tournament().nombre }}</h1>
        <p class="hosts"><svg lucideMapPin width="15" height="15" /><span>SEDES</span><strong>{{ hosts().length ? hosts().join('  •  ') : 'Por definir' }}</strong></p>
        <p class="period"><svg lucideCalendarDays width="15" height="15" /><span>PERIODO DEL TORNEO</span>{{ dateRange() }}</p>
      </div>
      <div class="banner-metric"><span><svg lucideClock width="15" height="15" /> DURACION</span><strong>{{ durationDays() }} dias</strong><small>Duracion del torneo</small></div>
      <div class="banner-status"><span>ESTADO DEL TORNEO</span><app-status-badge [status]="tournament().estado" [label]="statusLabel()" /><small>{{ phase() || 'Fase por definir' }}</small></div>
    </section>
  `,
  styles: `
    .world-banner { align-items:center; background:#07140f; border:1px solid rgba(232,180,50,.34); border-radius:14px; box-sizing:border-box; display:grid; gap:1.35rem; grid-template-columns:142px minmax(260px,1fr) 125px 155px; min-height:200px; overflow:hidden; padding:1.45rem 1.65rem; position:relative; } .world-banner::before, .world-banner::after { content:''; pointer-events:none; position:absolute; } .world-banner::before { border:1px solid rgba(232,180,50,.11); border-radius:50%; height:265px; left:35%; top:-175px; width:430px; } .world-banner::after { border-left:1px solid rgba(232,180,50,.22); height:84%; left:50%; top:8%; transform:skewX(-27deg); }
    .image-placeholder { align-content:center; aspect-ratio:1; background:rgba(34,211,77,.055); border:1px dashed rgba(232,180,50,.7); border-radius:50%; color:#e8b432; display:grid; justify-items:center; line-height:1.25; position:relative; text-align:center; z-index:1; } .image-placeholder span { color:#aeb9b3; font-size:.71rem; font-weight:700; margin-top:.35rem; }
    .world-main, .banner-metric, .banner-status { min-width:0; position:relative; z-index:1; } .eyebrow { color:#e8b432; font-size:.64rem; font-weight:850; letter-spacing:.12em; margin:0 0 .45rem; } h1 { color:#f4f6f5; font-size:clamp(1.65rem,3vw,2.7rem); letter-spacing:0; line-height:1; margin:0 0 .82rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .hosts, .period { align-items:center; color:#9fa8a3; display:flex; flex-wrap:wrap; font-size:.76rem; gap:.42rem; margin:.35rem 0; } .hosts svg, .period svg { color:#22d34d; } .hosts span, .period span { color:#728078; font-size:.61rem; font-weight:850; letter-spacing:.08em; } .hosts strong { color:#d5ddd8; font-weight:650; } .period { color:#b3bdb8; }
    .banner-metric, .banner-status { align-content:center; border-left:1px solid rgba(255,255,255,.11); display:grid; min-height:90px; padding-left:1.25rem; } .banner-metric > span, .banner-status > span { align-items:center; color:#89968f; display:flex; font-size:.61rem; font-weight:850; gap:.34rem; letter-spacing:.08em; } .banner-metric > span svg { color:#e8b432; } .banner-metric strong { color:#f4f6f5; font-size:1.55rem; line-height:1; margin:.52rem 0 .28rem; } .banner-metric small, .banner-status small { color:#849188; font-size:.68rem; } .banner-status app-status-badge { margin:.52rem 0 .4rem; }
    @media (max-width:1120px) { .world-banner { grid-template-columns:118px minmax(230px,1fr) 120px; } .banner-status { border-left:0; grid-column:2 / 4; min-height:0; padding-left:0; } }
    @media (max-width:700px) { .world-banner { gap:1rem; grid-template-columns:1fr 1fr; min-height:0; padding:1.2rem; } .image-placeholder { display:none; } .world-main { grid-column:span 2; } h1 { font-size:1.75rem; white-space:normal; } .banner-metric, .banner-status { border-left:0; border-top:1px solid rgba(255,255,255,.09); min-height:0; padding:1rem 0 0; } .banner-status { grid-column:auto; } .world-banner::after { display:none; } }
  `
})
export class WorldCupBannerComponent {
  readonly tournament = input.required<Tournament>();
  readonly hosts = input<string[]>([]);
  readonly phase = input('');
  readonly durationDays = input(0);
  readonly dateRange = input('');
  readonly statusLabel = input('BORRADOR');
}
