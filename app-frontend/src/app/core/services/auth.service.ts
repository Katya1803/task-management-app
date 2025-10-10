import { computed, inject, Injectable, signal } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { catchError, map, Observable, tap, throwError } from "rxjs";
import { jwtDecode } from 'jwt-decode';

import { environment } from "../../../environments/environment";
import { ApiResponse, MessageResponse, extractData } from "../models/api-response.model";
import { 
  AuthResponse, 
  FacebookLoginRequest, 
  GoogleLoginRequest, 
  JwtPayload, 
  LoginRequest, 
  RegisterRequest, 
  ResendOtpRequest, 
  User, 
  VerifyOtpRequest 
} from "../models/auth.model";

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private http = inject(HttpClient);

  // ==================== STATE MANAGEMENT ====================
  private _accessToken = signal<string | null>(null);
  private _currentUser = signal<User | null>(null);
  private _isRestoring = signal<boolean>(false);

  // Public readonly signals
  readonly accessToken = computed(() => this._accessToken());
  readonly currentUser = computed(() => this._currentUser());
  readonly isAuthenticated = computed(() => !!this._accessToken());
  readonly isRestoring = computed(() => this._isRestoring());

  constructor() {
    // ❌ KHÔNG gọi restoreSession() ngay trong constructor
    // ✅ Sẽ gọi sau khi app initialized
  }

  // ==================== SESSION MANAGEMENT ====================

  /**
   * Restore session from refresh token cookie
   * Should be called AFTER app initialization to avoid circular dependency
   */
  restoreSession(): void {
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

  // ==================== PUBLIC API METHODS ====================

  /**
   * Get current access token (used by interceptor and components)
   */
  getAccessToken(): string | null {
    return this._accessToken();
  }

  /**
   * Register a new user with email and password
   * Sends OTP verification email
   */
  register(request: RegisterRequest): Observable<MessageResponse> {
    return this.http.post<ApiResponse<MessageResponse>>(
      `${this.API_URL}/register`,
      request
    ).pipe(
      map(response => extractData(response)),
      tap(data => console.log('📝 Registration successful:', data.message)),
      catchError(this.handleError)
    );
  }

  /**
   * Verify email with OTP code
   */
  verifyEmail(request: VerifyOtpRequest): Observable<MessageResponse> {
    return this.http.post<ApiResponse<void>>(
      `${this.API_URL}/verify-email`,
      request
    ).pipe(
      map(response => ({
        message: response.message
      })),
      tap(data => console.log('✅ Email verified:', data.message)),
      catchError(this.handleError)
    );
  }

  /**
   * Request a new OTP code
   */
  resendOtp(request: ResendOtpRequest): Observable<MessageResponse> {
    return this.http.post<ApiResponse<MessageResponse>>(
      `${this.API_URL}/resend-otp`,
      request
    ).pipe(
      map(response => extractData(response)),
      tap(data => console.log('📧 OTP resent:', data.message)),
      catchError(this.handleError)
    );
  }

  /**
   * Login with email and password
   */
  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<ApiResponse<AuthResponse>>(
      `${this.API_URL}/login`,
      request,
      { withCredentials: true }
    ).pipe(
      map(response => extractData(response)),
      tap(authResponse => this.handleAuthSuccess(authResponse)),
      catchError(this.handleError)
    );
  }

  /**
   * Login with Google OAuth2
   */
  loginWithGoogle(idToken: string): Observable<AuthResponse> {
    const request: GoogleLoginRequest = { idToken };
    return this.http.post<ApiResponse<AuthResponse>>(
      `${this.API_URL}/google`,
      request,
      { withCredentials: true }
    ).pipe(
      map(response => extractData(response)),
      tap(authResponse => this.handleAuthSuccess(authResponse)),
      catchError(this.handleError)
    );
  }

  /**
   * Login with Facebook OAuth2
   */
  loginWithFacebook(accessToken: string): Observable<AuthResponse> {
    const request: FacebookLoginRequest = { accessToken };
    return this.http.post<ApiResponse<AuthResponse>>(
      `${this.API_URL}/facebook`,
      request,
      { withCredentials: true }
    ).pipe(
      map(response => extractData(response)),
      tap(authResponse => this.handleAuthSuccess(authResponse)),
      catchError(this.handleError)
    );
  }

  // ❌ REMOVED: linkEmail() method - endpoint deleted from backend

  /**
   * Refresh access token using refresh token cookie
   */
  refreshToken(): Observable<AuthResponse> {
    return this.http.post<ApiResponse<AuthResponse>>(
      `${this.API_URL}/refresh`,
      {},
      { withCredentials: true }
    ).pipe(
      map(response => extractData(response)),
      tap(authResponse => this.handleAuthSuccess(authResponse)),
      catchError(this.handleError)
    );
  }

  /**
   * Logout current user
   */
  logout(): Observable<MessageResponse> {
    return this.http.post<ApiResponse<void>>(
      `${this.API_URL}/logout`,
      {},
      { withCredentials: true }
    ).pipe(
      map(response => ({
        message: response.message
      })),
      tap(() => {
        this.clearAuthState();
        console.log('👋 Logged out successfully');
      }),
      catchError(this.handleError)
    );
  }

  // ==================== ERROR HANDLING ====================

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else if (error.error?.message) {
      // Server-side error with message
      errorMessage = error.error.message;
    } else if (error.status === 0) {
      errorMessage = 'Unable to connect to server. Please check your internet connection.';
    } else if (error.status === 401) {
      errorMessage = 'Authentication failed. Please login again.';
    } else if (error.status === 403) {
      errorMessage = 'Access denied. You do not have permission.';
    } else if (error.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    }

    console.error('❌ HTTP Error:', {
      status: error.status,
      message: errorMessage,
      error: error.error
    });

    return throwError(() => new Error(errorMessage));
  }
}