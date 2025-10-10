import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // ✅ Skip auth header for auth endpoints (including logout)
  if (isAuthEndpoint(req.url)) {
    return next(req);
  }

  const token = authService.getAccessToken();
  if (token) {
    req = addToken(req, token);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
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

function isAuthEndpoint(url: string): boolean {
  return url.includes('/api/auth/');
}