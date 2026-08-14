import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  LucideCalendarDays,
  LucideCircleDot,
  LucideEye,
  LucideEyeOff,
  LucideLockKeyhole,
  LucideMail,
  LucidePanelsTopLeft,
  LucideTrophy,
  LucideUsersRound
} from '@lucide/angular';

import { AuthService } from '../../core/auth/auth.service';
import { UserRole } from '../../core/auth/auth.models';

@Component({
  selector: 'app-auth-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    RouterLinkActive,
    LucideCalendarDays,
    LucideCircleDot,
    LucideEye,
    LucideEyeOff,
    LucideLockKeyhole,
    LucideMail,
    LucidePanelsTopLeft,
    LucideTrophy,
    LucideUsersRound
  ],
  templateUrl: './auth.page.html',
  styleUrl: './auth.page.scss'
})
export class AuthPage {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  protected readonly mode = signal<'login' | 'register'>(this.route.snapshot.data['mode'] === 'register' ? 'register' : 'login');
  protected readonly loading = signal(false);
  protected readonly serverError = signal('');
  protected readonly passwordVisible = signal(false);
  protected readonly isRegister = computed(() => this.mode() === 'register');

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rol: ['CONSULTA' as UserRole]
  });

  constructor() {
    this.updateValidators();
    this.route.data.subscribe((data) => {
      this.mode.set(data['mode'] === 'register' ? 'register' : 'login');
      this.serverError.set('');
      this.updateValidators();
    });
  }

  protected submit(): void {
    this.serverError.set('');
    this.updateValidators();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const value = this.form.getRawValue();
    const request = this.isRegister()
      ? this.auth.register({ nombre: value.nombre.trim(), email: value.email.trim(), password: value.password, rol: value.rol })
      : this.auth.login({ email: value.email.trim(), password: value.password });

    request.subscribe({
      next: () => this.router.navigateByUrl('/panel'),
      error: (error: HttpErrorResponse) => {
        this.serverError.set(this.getServerErrorMessage(error));
        this.loading.set(false);
      },
      complete: () => this.loading.set(false)
    });
  }

  protected hasError(control: AbstractControl<string>, error: string): boolean {
    return control.touched && control.hasError(error);
  }

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  private updateValidators(): void {
    const nombre = this.form.controls.nombre;
    if (this.isRegister()) {
      nombre.setValidators([Validators.required, Validators.minLength(2)]);
    } else {
      nombre.clearValidators();
      nombre.setValue('');
    }
    nombre.updateValueAndValidity({ emitEvent: false });
  }

  private getServerErrorMessage(error: HttpErrorResponse): string {
    const response = error.error;
    if (typeof response?.error === 'string') return response.error;
    if (typeof response?.message === 'string') return response.message;
    return 'No fue posible conectar con la API. Verifica la conexion e intentalo nuevamente.';
  }
}
