import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> =
    new BehaviorSubject<string | null>(null);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {

    // Skip authentication for auth endpoints (trừ refresh)
    if (this.isAuthEndpoint(request.url) && !request.url.includes('/refresh')) {
      return next.handle(request);
    }

    // Add Access Token to header
    const token = this.authService.getAccessToken();
    if (token) {
      request = this.addToken(request, token);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle 401 Unauthorized - Token expired
        if (error.status === 401) {
          return this.handle401Error(request, next);
        }

        // Handle 403 Forbidden - No permission
        if (error.status === 403) {
          this.router.navigate(['/auth/login']);
          return throwError(() => new Error('Access forbidden'));
        }

        return throwError(() => error);
      })
    );
  }

  /**
   * Add Authorization header with Bearer token
   */
  private addToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      },
      withCredentials: true  // Important: Gửi cookie cho Refresh Token
    });
  }

  /**
   * Handle 401 error - Try to refresh token
   */
  private handle401Error(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {

    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((response) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(response.accessToken);

          // Retry original request with new token
          return next.handle(this.addToken(request, response.accessToken));
        }),
        catchError((error) => {
          this.isRefreshing = false;

          // Refresh failed -> Redirect to login
          this.router.navigate(['/auth/login'], {
            queryParams: { returnUrl: this.router.url }
          });

          return throwError(() => error);
        })
      );
    } else {
      // Wait for refresh to complete
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => {
          return next.handle(this.addToken(request, token!));
        })
      );
    }
  }

  /**
   * Check if URL is an auth endpoint
   */
  private isAuthEndpoint(url: string): boolean {
    return url.includes('/api/auth/');
  }
}
