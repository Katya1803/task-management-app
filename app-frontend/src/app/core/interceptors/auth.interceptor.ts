import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // ✅ Skip auth header ONLY for public auth endpoints (not logout)
  if (isPublicAuthEndpoint(req.url)) {
    return next(req);
  }

  const token = authService.getAccessToken();
  if (token) {
    req = addToken(req, token);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // ✅ Don't retry if logout fails - just let it fail gracefully
      if (req.url.includes('/logout')) {
        console.warn('⚠️ Logout failed, but continuing...');
        return throwError(() => error);
      }

      if (error.status === 401 && !req.url.includes('/refresh')) {
        console.log('🔄 Token expired, attempting refresh...');
        
        return authService.refreshToken().pipe(
          switchMap((response) => {
            console.log('✅ Token refreshed successfully');
            const newReq = addToken(req, response.accessToken);
            return next(newReq);
          }),
          catchError((refreshError) => {
            console.error('❌ Token refresh failed:', refreshError);
            router.navigate(['/auth/login'], {
              queryParams: { returnUrl: router.url }
            });
            return throwError(() => refreshError);
          })
        );
      }

      if (error.status === 403) {
        console.error('❌ Access forbidden');
        router.navigate(['/home']);
        return throwError(() => new Error('Access forbidden'));
      }

      return throwError(() => error);
    })
  );
};

function addToken(req: any, token: string) {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    },
    withCredentials: true  
  });
}

function isPublicAuthEndpoint(url: string): boolean {
  // ✅ Only skip token for these endpoints
  const publicEndpoints = [
    '/api/auth/register',
    '/api/auth/verify-email',
    '/api/auth/resend-otp',
    '/api/auth/login',
    '/api/auth/google',
    '/api/auth/facebook',
    '/api/auth/refresh'
  ];
  
  return publicEndpoints.some(endpoint => url.includes(endpoint));
}