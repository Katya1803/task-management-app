// src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

// Google & Facebook Sign-In
import {
  GoogleLoginProvider,
  FacebookLoginProvider,
  SocialAuthServiceConfig
} from '@abacritt/angularx-social-login';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(),

    // Register AuthInterceptor
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },

    // OAuth2 Configuration (Google + Facebook)
    {
      provide: 'SocialAuthServiceConfig',
      useValue: {
        autoLogin: false,
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider(environment.google.clientId, {
              oneTapEnabled: false
            })
          },
          {
            id: FacebookLoginProvider.PROVIDER_ID,
            provider: new FacebookLoginProvider(environment.facebook.appId, {
              scope: 'email,public_profile',
              return_scopes: true,
              enable_profile_selector: true
            })
          }
        ],
        onError: (err: any) => {
          console.error('Social login error:', err);
        }
      } as SocialAuthServiceConfig
    }
  ]
};
