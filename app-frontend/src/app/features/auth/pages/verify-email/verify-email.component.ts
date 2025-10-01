import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../../core/services/auth.service';
import { interval, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss']
})
export class VerifyEmailComponent implements OnInit {
  verifyForm!: FormGroup;
  loading = false;
  resending = false;
  errorMessage = '';
  successMessage = '';
  email = '';

  // Countdown timer for resend OTP
  canResend = false;
  countdown = 60;
  private countdownSubscription?: Subscription;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    // Get email from query params
    this.email = this.route.snapshot.queryParams['email'] || '';

    if (!this.email) {
      this.router.navigate(['/auth/register']);
      return;
    }

    // Initialize form
    this.verifyForm = this.fb.group({
      otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });

    // Start countdown timer
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.countdownSubscription?.unsubscribe();
  }

  /**
   * Handle OTP verification
   */
  onSubmit(): void {
    if (this.verifyForm.invalid) {
      this.verifyForm.get('otp')?.markAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const otp = this.verifyForm.value.otp;

    this.authService.verifyEmail({ email: this.email, otp }).subscribe({
      next: (response) => {
        console.log('Email verified:', response);
        this.loading = false;
        this.successMessage = response.message;

        // Redirect to login after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = this.getErrorMessage(error.message);
        console.error('Verification failed:', error);
      }
    });
  }

  /**
   * Resend OTP
   */
  resendOtp(): void {
    if (!this.canResend || this.resending) return;

    this.resending = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.resendOtp({ email: this.email }).subscribe({
      next: (response) => {
        console.log('OTP resent:', response);
        this.resending = false;
        this.successMessage = 'Verification code sent successfully!';

        // Reset countdown
        this.canResend = false;
        this.countdown = 60;
        this.startCountdown();

        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.resending = false;
        this.errorMessage = this.getErrorMessage(error.message);
        console.error('Resend OTP failed:', error);
      }
    });
  }

  /**
   * Start countdown timer
   */
  private startCountdown(): void {
    this.countdownSubscription?.unsubscribe();

    this.countdownSubscription = interval(1000)
      .pipe(take(this.countdown))
      .subscribe({
        next: () => {
          this.countdown--;
          if (this.countdown === 0) {
            this.canResend = true;
          }
        }
      });
  }

  /**
   * Get user-friendly error messages
   */
  private getErrorMessage(error: string): string {
    if (error.includes('invalid') || error.includes('expired')) {
      return 'Invalid or expired verification code. Please try again.';
    }
    if (error.includes('rate limit') || error.includes('too many')) {
      return 'Too many attempts. Please wait 15 minutes before trying again.';
    }
    return 'Verification failed. Please try again.';
  }

  /**
   * Format countdown display
   */
  getCountdownDisplay(): string {
    const minutes = Math.floor(this.countdown / 60);
    const seconds = this.countdown % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Auto-format OTP input (add spaces every 3 digits)
   */
  onOtpInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, ''); // Remove non-digits

    if (value.length > 6) {
      value = value.substring(0, 6);
    }

    // Auto-submit when 6 digits entered
    if (value.length === 6) {
      this.verifyForm.patchValue({ otp: value });
      this.onSubmit();
    } else {
      this.verifyForm.patchValue({ otp: value });
    }
  }
}
