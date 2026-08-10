export type UserRole = 'ADMIN' | 'CONSULTA';

export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  rol: UserRole;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  nombre: string;
  rol?: UserRole;
}
