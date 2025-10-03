// File: app-frontend/src/app/features/auth/login/login.component.ts

import { Component, OnInit, AfterViewInit, inject, signal, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

declare const google: any;
declare const FB: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['../../../shared/styles/auth-common.scss', './login.component.scss']
})
export class LoginComponent implements OnInit, AfterViewInit {
  // ==================== SIGNALS ====================
  loading = signal(false);
  hidePassword = signal(true);
  errorMessage = signal('');
  returnUrl = signal('/home');

  // ==================== FORM ====================
  loginForm!: FormGroup;

  // ==================== SERVICES ====================
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private ngZone = inject(NgZone);

  // ==================== LIFECYCLE ====================
  ngOnInit(): void {
    // Initialize form
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Get return URL from route params or default to '/home'
    this.returnUrl.set(this.route.snapshot.queryParams['returnUrl'] || '/home');
  }

  ngAfterViewInit(): void {
    // Initialize Google Sign-In
    this.initializeGoogleSignIn();

    // Initialize Facebook SDK
    this.initializeFacebookSDK();
  }

  // ==================== GOOGLE SIGN-IN ====================
  private initializeGoogleSignIn(): void {
    if (typeof google === 'undefined') {
      setTimeout(() => this.initializeGoogleSignIn(), 500);
      return;
    }

    try {
      google.accounts.id.initialize({
        client_id: environment.google.clientId,
        callback: (response: any) => this.handleGoogleCallback(response),
        auto_select: false,
        cancel_on_tap_outside: true
      });

      // ✅ Let Google SDK render the button (works without strict origin config)
      const buttonElement = document.getElementById('google-signin-button');
      if (buttonElement) {
        google.accounts.id.renderButton(buttonElement, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          locale: 'en',
          width: buttonElement.offsetWidth
        });
        console.log('✅ Google Sign-In button rendered');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Google Sign-In:', error);
      this.errorMessage.set('Failed to load Google Sign-In');
    }
  }

  private handleGoogleCallback(response: any): void {
    this.ngZone.run(() => {
      if (!response.credential) {
        this.errorMessage.set('Google Sign-In failed');
        this.loading.set(false);
        return;
      }

      this.loading.set(true);
      this.errorMessage.set('');

      this.authService.loginWithGoogle(response.credential).subscribe({
        next: () => {
          this.loading.set(false);
          console.log('✅ Google login successful');
          this.router.navigate([this.returnUrl()]);
        },
        error: (error) => {
          this.loading.set(false);
          this.errorMessage.set(this.getErrorMessage(error.message));
          console.error('❌ Google login failed:', error);
        }
      });
    });
  }

  // ==================== FACEBOOK SIGN-IN ====================
  private initializeFacebookSDK(): void {
    // Wait for Facebook SDK to load
    if (typeof FB === 'undefined') {
      setTimeout(() => this.initializeFacebookSDK(), 500);
      return;
    }
    console.log('✅ Facebook SDK initialized');
  }

  loginWithFacebook(): void {
    if (typeof FB === 'undefined') {
      this.errorMessage.set('Facebook SDK not loaded');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    FB.login((response: any) => {
      this.ngZone.run(() => {
        if (response.authResponse) {
          const accessToken = response.authResponse.accessToken;
          console.log('✅ Facebook access token received');

          this.authService.loginWithFacebook(accessToken).subscribe({
            next: () => {
              this.loading.set(false);
              console.log('✅ Facebook login successful');
              this.router.navigate([this.returnUrl()]);
            },
            error: (error) => {
              this.loading.set(false);
              this.errorMessage.set(this.getErrorMessage(error.message));
              console.error('❌ Facebook login failed:', error);
            }
          });
        } else {
          this.loading.set(false);
          this.errorMessage.set('Facebook login cancelled');
          console.log('❌ Facebook login cancelled by user');
        }
      });
    }, { scope: 'email,public_profile' });
  }

  // ==================== EMAIL/PASSWORD LOGIN ====================
  onSubmit(): void {
    // Validate form
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password }).subscribe({
      next: () => {
        this.loading.set(false);
        console.log('✅ Login successful');
        this.router.navigate([this.returnUrl()]);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(this.getErrorMessage(error.message));
        console.error('❌ Login failed:', error);
      }
    });
  }

  // ==================== UI HELPERS ====================
  togglePasswordVisibility(): void {
    this.hidePassword.update(value => !value);
  }

  // ==================== ERROR HANDLING ====================
  private getErrorMessage(error: string): string {
    if (error.includes('email') && error.includes('verified')) {
      return 'Please verify your email first. Check your inbox.';
    }
    if (error.includes('credentials') || error.includes('password')) {
      return 'Invalid email or password.';
    }
    if (error.includes('disabled')) {
      return 'Account disabled. Please contact support.';
    }
    if (error.includes('Google') || error.includes('Facebook')) {
      return 'Social login failed. Please try again.';
    }
    return 'Login failed. Please try again.';
  }

  // ==================== FORM VALIDATION ====================
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (!field?.touched) return '';

    if (field?.hasError('required')) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
    }
    if (field?.hasError('email')) {
      return 'Please enter a valid email';
    }
    if (field?.hasError('minlength')) {
      return 'Password must be at least 6 characters';
    }
    return '';
  }
}