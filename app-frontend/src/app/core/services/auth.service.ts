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
  LinkEmailRequest, 
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

  /**
   * Link email to existing OAuth2 account
   */
  linkEmail(request: LinkEmailRequest): Observable<AuthResponse> {
    return this.http.post<ApiResponse<AuthResponse>>(
      `${this.API_URL}/link-email`,
      request,
      { withCredentials: true }
    ).pipe(
      map(response => extractData(response)),
      tap(authResponse => this.handleAuthSuccess(authResponse)),
      catchError(this.handleError)
    );
  }

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

  /**
   * Decode JWT token
   */
  private decodeToken(token: string): JwtPayload | null {
    try {
      return jwtDecode<JwtPayload>(token);
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  }

  /**
   * Global error handler for auth service
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error - check if it's ApiResponse format
      if (error.error?.message) {
        errorMessage = error.error.message;
      } else {
        errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      }
    }

    console.error('❌ Authentication error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}