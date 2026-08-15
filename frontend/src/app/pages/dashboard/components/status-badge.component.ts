import { Component, input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  template: '<span class="status" [class]="\'status \'+ status().toLowerCase()"><span aria-hidden="true" class="status-dot"></span>{{ label() }}</span>',
  styles: `
    .status { align-items:center; border:1px solid transparent; border-radius:999px; display:inline-flex; font-size:.66rem; font-weight:850; gap:.38rem; letter-spacing:.03em; padding:.4rem .61rem; white-space:nowrap; } .status-dot { border-radius:50%; height:.38rem; width:.38rem; } .programado, .borrador { background:rgba(232,180,50,.11); border-color:rgba(232,180,50,.24); color:#efd17c; } .programado .status-dot, .borrador .status-dot { background:#e8b432; } .en_curso, .en_juego { background:rgba(34,211,77,.11); border-color:rgba(34,211,77,.25); color:#72e68c; } .en_curso .status-dot, .en_juego .status-dot { background:#22d34d; } .finalizado { background:rgba(159,168,163,.1); border-color:rgba(159,168,163,.18); color:#b9c1bd; } .finalizado .status-dot { background:#839088; }
  `
})
export class StatusBadgeComponent {
  readonly status = input.required<string>();
  readonly label = input.required<string>();
}
