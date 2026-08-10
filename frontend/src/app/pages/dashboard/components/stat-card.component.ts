import { Component, input } from '@angular/core';
import { LucideCalendarDays, LucideCircleDot, LucideMedal, LucideUsersRound } from '@lucide/angular';

@Component({
  selector: 'app-stat-card',
  imports: [LucideCalendarDays, LucideCircleDot, LucideMedal, LucideUsersRound],
  template: `
    <article class="stat-card"><span class="icon-shell">@switch (icon()) { @case ('users') { <svg lucideUsersRound width="18" height="18" /> } @case ('calendar') { <svg lucideCalendarDays width="18" height="18" /> } @case ('live') { <svg lucideCircleDot width="18" height="18" /> } @default { <svg lucideMedal width="18" height="18" /> } }</span><div><strong>{{ value() }}</strong><span>{{ label() }}</span></div></article>
  `,
  styles: `
    .stat-card { align-items:center; background:#fff; border:1px solid #e3e8e5; border-radius:10px; display:flex; gap:.75rem; min-height:88px; padding:1rem; }
    .icon-shell { align-items:center; background:#edf8f0; border-radius:8px; color:#179447; display:flex; height:36px; justify-content:center; width:36px; }
    strong { color:#18201c; display:block; font-size:1.45rem; line-height:1.05; } span:not(.icon-shell) { color:#66706a; display:block; font-size:.78rem; margin-top:.18rem; }
  `
})
export class StatCardComponent {
  readonly icon = input.required<'users' | 'calendar' | 'live' | 'medal'>();
  readonly value = input.required<number>();
  readonly label = input.required<string>();
}
