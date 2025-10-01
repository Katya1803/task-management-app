// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../environments/environment';

// ==================== INTERFACES - MAP CHÍNH XÁC VỚI BACKEND DTOs ====================

// Map với UserDto.java
export interface User {
  publicId: string;
  email: string;
  fullName: string;
  role: string;          // USER | ADMIN
  authProvider: string;  // LOCAL | GOOGLE | FACEBOOK
  emailVerified: boolean;
}

// Map với AuthResponse.java
export interface AuthResponse {
  accessToken: string;
  tokenType: string;     // "Bearer"
  expiresIn: number;     // seconds
  user: User;
}

// Map với RegisterRequest.java
export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

// Map với LoginRequest.java
export interface LoginRequest {
  email: string;
  password: string;
}

// Map với VerifyOtpRequest.java
export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

// Map với ResendOtpRequest.java
export interface ResendOtpRequest {
  email: string;
}

// Map với GoogleLoginRequest.java
export interface GoogleLoginRequest {
  idToken: string;
}

// Map với FacebookLoginRequest.java
export interface FacebookLoginRequest {
  accessToken: string;
}

// Map với LinkEmailRequest.java
export interface LinkEmailRequest {
  providerId: string;
  provider: string;      // GOOGLE | FACEBOOK
  email: string;
}

// JWT Payload structure
interface JwtPayload {
  sub: string;           // userId
  email: string;
  role: string;
  publicId: string;
  iat: number;           // issued at
  exp: number;           // expires at
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl + '/api/auth';

  // Access Token lưu trong memory (BehaviorSubject)
  private accessTokenSubject = new BehaviorSubject<string | null>(null);
  public accessToken$ = this.accessTokenSubject.asObservable();

  // Current User state
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // Authentication state
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient) {
    // Check if user was logged in (có Refresh Token trong cookie)
    this.checkAuthStatus();
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * LOCAL AUTHENTICATION - Register
   * POST /api/auth/register
   */
  register(request: RegisterRequest): Observable<{ message: string; email: string }> {
    return this.http.post<{ message: string; email: string }>(
      `${this.API_URL}/register`,
      request
    ).pipe(
      tap(response => console.log('Registration successful:', response.message)),
      catchError(this.handleError)
    );
  }

  /**
   * Verify Email with OTP
   * POST /api/auth/verify-email
   */
  verifyEmail(request: VerifyOtpRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.API_URL}/verify-email`,
      request
    ).pipe(
      tap(response => console.log('Email verified:', response.message)),
      catchError(this.handleError)
    );
  }

  /**
   * Resend OTP
   * POST /api/auth/resend-otp
   */
  resendOtp(request: ResendOtpRequest): Observable<{ message: string; email: string }> {
    return this.http.post<{ message: string; email: string }>(
      `${this.API_URL}/resend-otp`,
      request
    ).pipe(
      tap(response => console.log('OTP resent:', response.message)),
      catchError(this.handleError)
    );
  }

  /**
   * LOCAL AUTHENTICATION - Login
   * POST /api/auth/login
   * Refresh Token tự động lưu trong HttpOnly Cookie
   */
  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.API_URL}/login`,
      request,
      { withCredentials: true }  // Important: Gửi cookie
    ).pipe(
      tap(response => this.handleAuthSuccess(response)),
      catchError(this.handleError)
    );
  }

  /**
   * GOOGLE OAUTH2 LOGIN
   * POST /api/auth/google
   */
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

  /**
   * FACEBOOK OAUTH2 LOGIN
   * POST /api/auth/facebook
   */
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

  /**
   * Link Email to OAuth2 Account (Facebook fallback)
   * POST /api/auth/link-email
   */
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

  /**
   * Refresh Access Token
   * POST /api/auth/refresh
   * Refresh Token tự động gửi qua cookie
   */
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

  /**
   * Logout
   * POST /api/auth/logout
   */
  logout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.API_URL}/logout`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(() => this.handleLogoutSuccess()),
      catchError(this.handleError)
    );
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.accessTokenSubject.value;
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
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

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Handle successful authentication
   */
  private handleAuthSuccess(response: AuthResponse): void {
    // Lưu Access Token vào memory (BehaviorSubject)
    this.accessTokenSubject.next(response.accessToken);

    // Lưu User info
    this.currentUserSubject.next(response.user);

    // Update authentication state
    this.isAuthenticatedSubject.next(true);

    console.log('Authentication successful:', {
      user: response.user.email,
      tokenType: response.tokenType,
      expiresIn: `${response.expiresIn}s`
    });
  }

  /**
   * Handle logout success
   */
  private handleLogoutSuccess(): void {
    this.accessTokenSubject.next(null);
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    console.log('Logged out successfully');
  }

  /**
   * Check authentication status on app init
   * Try to refresh token if cookie exists
   */
  private checkAuthStatus(): void {
    // Thử refresh token để check xem user có đang đăng nhập không
    this.refreshToken().subscribe({
      next: () => console.log('User session restored'),
      error: () => console.log('No active session')
    });
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = error.error?.message ||
        error.error?.error ||
        `Error Code: ${error.status}\nMessage: ${error.message}`;
    }

    console.error('Authentication error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
