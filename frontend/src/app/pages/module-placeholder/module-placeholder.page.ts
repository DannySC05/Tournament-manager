import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideConstruction } from '@lucide/angular';

@Component({
  selector: 'app-module-placeholder-page',
  imports: [RouterLink, LucideArrowLeft, LucideConstruction],
  template: `
    <main class="placeholder"><section><span class="icon"><svg lucideConstruction width="25" height="25" /></span><p>MÓDULO INDEPENDIENTE</p><h1>{{ moduleName }}</h1><span>Este espacio quedará preparado para su propia gestión, sin cargar funciones CRUD dentro del Inicio.</span><a routerLink="/panel"><svg lucideArrowLeft width="16" height="16" /> Volver al inicio</a></section></main>
  `,
  styles: `
    .placeholder { align-items:center; background:#f5f7f6; display:flex; justify-content:center; min-height:100vh; padding:1.5rem; } section { background:#fff; border:1px solid #e3e8e5; border-radius:12px; max-width:420px; padding:2rem; text-align:center; } .icon { align-items:center; background:#edf8f0; border-radius:9px; color:#179447; display:inline-flex; height:48px; justify-content:center; width:48px; } p { color:#0f6935; font-size:.7rem; font-weight:800; margin:1.25rem 0 .45rem; } h1 { color:#18201c; font-size:1.4rem; margin:0 0 .7rem; } section > span:last-of-type { color:#66706a; display:block; font-size:.86rem; line-height:1.5; } a { align-items:center; color:#0f6935; display:inline-flex; font-size:.82rem; font-weight:750; gap:.4rem; margin-top:1.5rem; text-decoration:none; }
  `
})
export class ModulePlaceholderPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly moduleName = this.toTitle(this.route.snapshot.paramMap.get('module') ?? 'Módulo');

  private toTitle(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
