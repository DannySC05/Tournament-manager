import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly isAuthScreen = signal(this.isAuthUrl(this.router.url));

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      this.isAuthScreen.set(this.isAuthUrl(event.urlAfterRedirects));
    });
  }

  protected logout(): void {
    this.auth.logout();
  }

  private isAuthUrl(url: string): boolean {
    return url.startsWith('/acceso') || url.startsWith('/registro');
  }
}
