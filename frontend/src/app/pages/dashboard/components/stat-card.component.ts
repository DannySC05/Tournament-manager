import { Component, input } from '@angular/core';
import { LucideCalendarDays, LucideMedal, LucideUsersRound } from '@lucide/angular';

@Component({
  selector: 'app-stat-card',
  imports: [LucideCalendarDays, LucideMedal, LucideUsersRound],
  template: `
    <article class="stat-card" [class.gold]="tone() === 'gold'">
      <div><span class="label">{{ label() }}</span><strong>{{ value() }}</strong><small>{{ detail() }}</small></div>
      <span class="icon" aria-hidden="true">@switch (icon()) { @case ('users') { <svg lucideUsersRound width="33" height="33" /> } @case ('calendar') { <svg lucideCalendarDays width="33" height="33" /> } @default { <svg lucideMedal width="33" height="33" /> } }</span>
    </article>
  `,
  styles: `
    .stat-card { align-items:center; background:rgba(6,20,15,.86); border:1px solid rgba(255,255,255,.09); border-radius:14px; box-sizing:border-box; display:flex; justify-content:space-between; min-height:124px; overflow:hidden; padding:1.15rem 1.25rem; position:relative; } .label { color:#9fa8a3; display:block; font-size:.78rem; font-weight:700; } strong { color:#f4f6f5; display:block; font-size:2rem; line-height:1; margin:.5rem 0 .3rem; } small { color:#738278; font-size:.72rem; } .icon { color:#22d34d; opacity:.55; } .gold .icon { color:#e8b432; }
  `
})
export class StatCardComponent {
  readonly icon = input.required<'users' | 'calendar' | 'medal'>();
  readonly value = input.required<number>();
  readonly label = input.required<string>();
  readonly detail = input.required<string>();
  readonly tone = input<'green' | 'gold'>('green');
}
