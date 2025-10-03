import { Component, OnInit, inject, signal } from '@angular/core';
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
export class LoginComponent implements OnInit {
  loading = signal(false);
  hidePassword = signal(true);
  errorMessage = signal('');
  returnUrl = signal('/home');

  loginForm!: FormGroup;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.returnUrl.set(this.route.snapshot.queryParams['returnUrl'] || '/home');
    
    this.initializeFacebookSDK();
  }

  loginWithGoogle(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    const redirectUri = `${window.location.origin}/auth/google-callback`;
    const scope = 'openid profile email';
    const responseType = 'id_token token';
    const nonce = Math.random().toString(36).substring(2, 15);

    localStorage.setItem('google_auth_nonce', nonce);
    localStorage.setItem('google_auth_return_url', this.returnUrl());

    const params = new URLSearchParams({
      client_id: environment.google.clientId,
      redirect_uri: redirectUri,
      response_type: responseType,
      scope: scope,
      nonce: nonce,
      state: this.returnUrl(),
      prompt: 'select_account'
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  private initializeFacebookSDK(): void {
    const checkFB = setInterval(() => {
      if (typeof FB !== 'undefined') {
        console.log('✅ Facebook SDK initialized');
        clearInterval(checkFB);
      }
    }, 500);

    setTimeout(() => clearInterval(checkFB), 10000);
  }

  loginWithFacebook(): void {
    if (typeof FB === 'undefined') {
      this.errorMessage.set('Facebook SDK not loaded');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    FB.login((response: any) => {
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
        this.errorMessage.set('Facebook login was cancelled');
        console.log('❌ Facebook login cancelled');
      }
    }, { scope: 'public_profile,email' });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
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

  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (!field || !field.touched || !field.errors) {
      return '';
    }

    if (field.errors['required']) {
      return `${this.capitalize(fieldName)} is required`;
    }
    if (field.errors['email']) {
      return 'Please enter a valid email address';
    }
    if (field.errors['minlength']) {
      return `${this.capitalize(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
    }

    return 'Invalid field';
  }

  private getErrorMessage(message: string): string {
    const errorMap: { [key: string]: string } = {
      'Invalid credentials': 'Invalid email or password',
      'Account not verified': 'Please verify your email before logging in',
      'Account is disabled': 'Your account has been disabled. Please contact support',
      'Too many attempts': 'Too many login attempts. Please try again later'
    };

    return errorMap[message] || message || 'An error occurred. Please try again';
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}