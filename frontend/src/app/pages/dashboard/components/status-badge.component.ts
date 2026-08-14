import { Component, input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  template: '<span class="status" [class]="\'status \'+ status().toLowerCase()"><span aria-hidden="true" class="status-dot"></span>{{ label() }}</span>',
  styles: `
    .status { align-items:center; border-radius:999px; display:inline-flex; font-size:.68rem; font-weight:800; gap:.38rem; letter-spacing:0; padding:.38rem .58rem; white-space:nowrap; }
    .status-dot { border-radius:50%; height:.38rem; width:.38rem; }
    .programado, .borrador { background:#eef2f0; color:#5f6963; } .programado .status-dot, .borrador .status-dot { background:#87908b; }
    .en_curso, .en_juego { background:#e7f6ec; color:#0f6935; } .en_curso .status-dot, .en_juego .status-dot { background:#179447; }
    .finalizado { background:#eef4f0; color:#52665a; } .finalizado .status-dot { background:#6b8272; }
  `
})
export class StatusBadgeComponent {
  readonly status = input.required<string>();
  readonly label = input.required<string>();
}
