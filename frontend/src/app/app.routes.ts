import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guard';
import { AuthPage } from './pages/auth/auth.page';
import { DashboardPage } from './pages/dashboard/dashboard.page';
import { ModulePlaceholderPage } from './pages/module-placeholder/module-placeholder.page';

export const routes: Routes = [
  { path: 'acceso', component: AuthPage, canActivate: [guestGuard] },
  { path: 'registro', component: AuthPage, canActivate: [guestGuard], data: { mode: 'register' } },
  { path: 'panel', component: DashboardPage, canActivate: [authGuard] },
  { path: 'modulos/:module', component: ModulePlaceholderPage, canActivate: [authGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'panel' },
  { path: '**', redirectTo: 'panel' }
];
