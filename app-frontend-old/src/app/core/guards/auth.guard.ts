import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * ✅ Auth Guard - Protect authenticated routes
 */
export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // ✅ Check if authenticated
  if (authService.isAuthenticated()) {
    return true;
  }

  // ✅ Check if still restoring session
  if (authService.isRestoring()) {
    console.log('⏳ Session restoration in progress...');
    return new Promise<boolean>((resolve) => {
      setTimeout(() => {
        if (authService.isAuthenticated()) {
          console.log('✅ Session restored - access granted');
          resolve(true);
        } else {
          console.log('❌ Access denied - redirecting to login');
          router.navigate(['/auth/login'], {
            queryParams: { returnUrl: state.url }
          });
          resolve(false);
        }
      }, 500);
    });
  }

  // Not authenticated
  console.log('❌ Access denied - redirecting to login');
  router.navigate(['/auth/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};

/**
 * ✅ Guest Guard - Redirect authenticated users
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  console.log('✅ Already authenticated - redirecting to dashboard');
  router.navigate(['/dashboard']);
  return false;
};

/**
 * ✅ Role Guard - Check user permissions
 */
export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const user = authService.getCurrentUser();

    if (!user) {
      router.navigate(['/auth/login'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    }

    if (allowedRoles.includes(user.role)) {
      return true;
    }

    console.log('❌ Access forbidden - insufficient permissions');
    router.navigate(['/forbidden']);
    return false;
  };
};
