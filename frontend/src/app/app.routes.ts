import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guard';
import { AuthPage } from './pages/auth/auth.page';
import { DashboardPage } from './pages/dashboard/dashboard.page';
import { ModulePlaceholderPage } from './pages/module-placeholder/module-placeholder.page';
import { TournamentsPage } from './pages/tournaments/tournaments.page';
import { TeamsPage } from './pages/teams/teams.page';
import { MatchesPage } from './pages/matches/matches.page';
import { ResultsPage } from './pages/results/results.page';

export const routes: Routes = [
  { path: 'acceso', component: AuthPage, canActivate: [guestGuard] },
  { path: 'registro', component: AuthPage, canActivate: [guestGuard], data: { mode: 'register' } },
  { path: 'panel', component: DashboardPage, canActivate: [authGuard] },
  { path: 'modulos/torneos', component: TournamentsPage, canActivate: [authGuard] },
  { path: 'modulos/equipos', component: TeamsPage, canActivate: [authGuard] },
  { path: 'modulos/partidos', component: MatchesPage, canActivate: [authGuard] },
  { path: 'modulos/resultados', component: ResultsPage, canActivate: [authGuard] },
  { path: 'modulos/:module', component: ModulePlaceholderPage, canActivate: [authGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'panel' },
  { path: '**', redirectTo: 'panel' }
];
