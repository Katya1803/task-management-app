import { Component, OnInit, AfterViewInit, inject, NgZone, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';

declare const google: any;

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
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, AfterViewInit {
  // ✅ Signals for component state
  loading = signal(false);
  hidePassword = signal(true);
  errorMessage = signal('');
  returnUrl = signal('/dashboard');

  loginForm!: FormGroup;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private ngZone = inject(NgZone);

  ngOnInit(): void {
    this.returnUrl.set(this.route.snapshot.queryParams['returnUrl'] || '/dashboard');

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngAfterViewInit(): void {
    this.initializeGoogleSignIn();
  }

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

      const buttonElement = document.getElementById('google-signin-button');
      if (buttonElement) {
        google.accounts.id.renderButton(buttonElement, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: buttonElement.offsetWidth
        });
        console.log('✅ Google Sign-In initialized');
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
        return;
      }

      this.loading.set(true);
      this.errorMessage.set('');

      this.authService.loginWithGoogle(response.credential).subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate([this.returnUrl()]);
        },
        error: (error) => {
          this.loading.set(false);
          this.errorMessage.set('Google login failed: ' + error.message);
        }
      });
    });
  }

  onSubmit(): void {
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
        this.router.navigate([this.returnUrl()]);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(this.getErrorMessage(error.message));
      }
    });
  }

  togglePasswordVisibility(): void {
    this.hidePassword.update(value => !value);
  }

  private getErrorMessage(error: string): string {
    if (error.includes('email')) {
      return 'Email not verified. Please check your inbox.';
    }
    if (error.includes('credentials') || error.includes('password')) {
      return 'Invalid email or password.';
    }
    if (error.includes('disabled')) {
      return 'Account disabled. Please contact support.';
    }
    return 'Login failed. Please try again.';
  }

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
      return `Must be at least 6 characters`;
    }
    return '';
  }
}
