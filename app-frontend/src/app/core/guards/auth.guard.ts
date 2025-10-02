import { inject } from "@angular/core";
import { Router , CanActivateFn, ActivatedRouteSnapshot , RouterStateSnapshot } from "@angular/router";
import { AuthService } from "../services/auth.service";

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  if (authService.isRestoring()) {
    console.log('⏳ Session restoration in progress...');
    return new Promise<boolean>((resolve) => {
      const checkInterval = setInterval(() => {
        if (!authService.isRestoring()) {
          clearInterval(checkInterval);
          
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
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        if (!authService.isAuthenticated()) {
          console.log('⏱️ Session restoration timeout - redirecting to login');
          router.navigate(['/auth/login'], {
            queryParams: { returnUrl: state.url }
          });
          resolve(false);
        }
      }, 3000);
    });
  }

  console.log('❌ Access denied - redirecting to login');
  router.navigate(['/auth/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};


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


export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const user = authService.getCurrentUser();

    if (!user) {
      console.log('❌ No user found - redirecting to login');
      router.navigate(['/auth/login'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    }

    if (allowedRoles.includes(user.role)) {
      console.log('✅ Role access granted:', user.role);
      return true;
    }

    console.log('❌ Access forbidden - insufficient permissions');
    router.navigate(['/dashboard']);
    return false;
  };
};