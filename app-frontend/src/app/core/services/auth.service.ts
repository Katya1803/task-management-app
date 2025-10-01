import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {jwtDecode} from "jwt-decode";

// ==================== INTERFACES ====================

export interface User {
  publicId: string;
  email: string;
  fullName: string;
  role: string;
  authProvider: string;
  emailVerified: boolean;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface ResendOtpRequest {
  email: string;
}

export interface GoogleLoginRequest {
  idToken: string;
}

export interface FacebookLoginRequest {
  accessToken: string;
}

export interface LinkEmailRequest {
  providerId: string;
  provider: string;
  email: string;
}

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  publicId: string;
  iat: number;
  exp: number;
}

// ==================== SERVICE ====================

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl + '/api/auth';
  private http = inject(HttpClient);

  // ✅ Signals - Angular 16 compatible
  private _accessToken = signal<string | null>(null);
  private _currentUser = signal<User | null>(null);
  private _isRestoring = signal<boolean>(false);

  // ✅ Public computed signals (read-only)
  readonly accessToken = computed(() => this._accessToken());
  readonly currentUser = computed(() => this._currentUser());
  readonly isAuthenticated = computed(() => !!this._accessToken());
  readonly isRestoring = computed(() => this._isRestoring());

  constructor() {
    this.restoreSession();
  }

  // ==================== SESSION MANAGEMENT ====================

  private restoreSession(): void {
    if (this._isRestoring()) return;

    this._isRestoring.set(true);
    console.log('🔄 Attempting to restore session...');

    this.refreshToken().subscribe({
      next: () => {
        console.log('✅ Session restored successfully');
        this._isRestoring.set(false);
      },
      error: () => {
        console.log('❌ No active session to restore');
        this._isRestoring.set(false);
        this.clearAuthState();
      }
    });
  }

  private clearAuthState(): void {
    this._accessToken.set(null);
    this._currentUser.set(null);
  }

  private handleAuthSuccess(response: AuthResponse): void {
    this._accessToken.set(response.accessToken);
    this._currentUser.set(response.user);

    console.log('✅ Authentication successful:', {
      user: response.user.email,
      provider: response.user.authProvider,
      expiresIn: `${response.expiresIn}s`
    });
  }

  // ==================== PUBLIC API ====================

  register(request: RegisterRequest): Observable<{ message: string; email: string }> {
    return this.http.post<{ message: string; email: string }>(
      `${this.API_URL}/register`,
      request
    ).pipe(
      tap(response => console.log('📝 Registration successful:', response.message)),
      catchError(this.handleError)
    );
  }

  verifyEmail(request: VerifyOtpRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.API_URL}/verify-email`,
      request
    ).pipe(
      tap(response => console.log('✅ Email verified:', response.message)),
      catchError(this.handleError)
    );
  }

  resendOtp(request: ResendOtpRequest): Observable<{ message: string; email: string }> {
    return this.http.post<{ message: string; email: string }>(
      `${this.API_URL}/resend-otp`,
      request
    ).pipe(
      tap(response => console.log('📧 OTP resent:', response.message)),
      catchError(this.handleError)
    );
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.API_URL}/login`,
      request,
      { withCredentials: true }
    ).pipe(
      tap(response => this.handleAuthSuccess(response)),
      catchError(this.handleError)
    );
  }

  loginWithGoogle(idToken: string): Observable<AuthResponse> {
    const request: GoogleLoginRequest = { idToken };
    return this.http.post<AuthResponse>(
      `${this.API_URL}/google`,
      request,
      { withCredentials: true }
    ).pipe(
      tap(response => this.handleAuthSuccess(response)),
      catchError(this.handleError)
    );
  }

  loginWithFacebook(accessToken: string): Observable<AuthResponse> {
    const request: FacebookLoginRequest = { accessToken };
    return this.http.post<AuthResponse>(
      `${this.API_URL}/facebook`,
      request,
      { withCredentials: true }
    ).pipe(
      tap(response => this.handleAuthSuccess(response)),
      catchError(this.handleError)
    );
  }

  linkEmail(request: LinkEmailRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.API_URL}/link-email`,
      request,
      { withCredentials: true }
    ).pipe(
      tap(response => this.handleAuthSuccess(response)),
      catchError(this.handleError)
    );
  }

  refreshToken(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.API_URL}/refresh`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(response => this.handleAuthSuccess(response)),
      catchError(this.handleError)
    );
  }

  logout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.API_URL}/logout`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(() => {
        this.clearAuthState();
        console.log('👋 Logged out successfully');
      }),
      catchError(this.handleError)
    );
  }

  // ==================== UTILITY METHODS ====================

  getAccessToken(): string | null {
    return this._accessToken();
  }

  getCurrentUser(): User | null {
    return this._currentUser();
  }

  getIsAuthenticated(): boolean {
    return this.isAuthenticated();
  }

  getIsRestoring(): boolean {
    return this._isRestoring();
  }

  private decodeToken(token: string): JwtPayload | null {
    try {
      return jwtDecode<JwtPayload>(token);
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }

  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = error.error?.message ||
        error.error?.error ||
        `Error Code: ${error.status}\nMessage: ${error.message}`;
    }

    console.error('❌ Authentication error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
