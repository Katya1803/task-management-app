// ==================== VERIFY EMAIL COMPONENT ====================
// File: app-frontend/src/app/features/auth/pages/verify-email/verify-email.component.ts

import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { interval, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './verify-email.component.html',
  styleUrls: ['../../../shared/styles/auth-common.scss', './verify-email.component.scss']
})
export class VerifyEmailComponent implements OnInit, OnDestroy {
  // ==================== SIGNALS ====================
  loading = signal(false);
  resending = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  email = signal('');

  // OTP inputs
  otpDigits = signal<string[]>(['', '', '', '', '', '']);

  // Countdown timer
  canResend = signal(false);
  countdown = signal(60);
  private countdownSubscription?: Subscription;

  // ==================== COMPUTED ====================
  // Check if all OTP digits are filled
  isOtpComplete = computed(() => {
    return this.otpDigits().every(digit => digit !== '');
  });

  // ==================== SERVICES ====================
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // ==================== LIFECYCLE ====================
  ngOnInit(): void {
    // Get email from query params
    this.email.set(this.route.snapshot.queryParams['email'] || '');

    if (!this.email()) {
      this.errorMessage.set('No email provided. Please register again.');
      return;
    }

    // Start countdown timer
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.countdownSubscription?.unsubscribe();
  }

  // ==================== OTP INPUT HANDLING ====================
  onOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    // Only allow single digit
    if (value.length > 1) {
      input.value = value.charAt(0);
    }

    // Update digits array
    const digits = this.otpDigits();
    digits[index] = input.value;
    this.otpDigits.set([...digits]);

    // Auto-focus next input
    if (input.value && index < 5) {
      const nextInput = input.parentElement?.nextElementSibling?.querySelector('input');
      nextInput?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (digits.every(d => d !== '') && digits.length === 6) {
      this.verifyOtp();
    }
  }

  onOtpKeydown(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;

    // Handle backspace
    if (event.key === 'Backspace' && !input.value && index > 0) {
      const prevInput = input.parentElement?.previousElementSibling?.querySelector('input');
      prevInput?.focus();
    }

    // Handle paste
    if (event.key === 'v' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      navigator.clipboard.readText().then(text => {
        const digits = text.replace(/\D/g, '').split('').slice(0, 6);
        this.otpDigits.set([...digits, '', '', '', '', ''].slice(0, 6));

        // Fill inputs
        digits.forEach((digit, i) => {
          const otpInput = document.getElementById(`otp-${i}`) as HTMLInputElement;
          if (otpInput) {
            otpInput.value = digit;
          }
        });

        // Focus last filled input
        const lastIndex = digits.length - 1;
        document.getElementById(`otp-${lastIndex}`)?.focus();
      });
    }
  }

  // ==================== VERIFY OTP ====================
  verifyOtp(): void {
    const otp = this.otpDigits().join('');

    if (otp.length !== 6) {
      this.errorMessage.set('Please enter all 6 digits');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.verifyEmail({ email: this.email(), otp }).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.successMessage.set(response.message);
        console.log('✅ Email verified successfully');

        // Redirect to login after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(this.getErrorMessage(error.message));
        console.error('❌ Verification failed:', error);

        // Clear OTP inputs on error
        this.clearOtp();
      }
    });
  }

  // ==================== RESEND OTP ====================
  resendOtp(): void {
    if (!this.canResend()) return;

    this.resending.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.resendOtp({ email: this.email() }).subscribe({
      next: (response) => {
        this.resending.set(false);
        this.successMessage.set(response.message);
        console.log('📧 OTP resent successfully');

        // Reset countdown
        this.canResend.set(false);
        this.countdown.set(60);
        this.startCountdown();

        // Clear OTP inputs
        this.clearOtp();
      },
      error: (error) => {
        this.resending.set(false);
        this.errorMessage.set(this.getErrorMessage(error.message));
        console.error('❌ Resend failed:', error);
      }
    });
  }

  // ==================== HELPERS ====================
  private clearOtp(): void {
    this.otpDigits.set(['', '', '', '', '', '']);

    // Clear all input values
    for (let i = 0; i < 6; i++) {
      const input = document.getElementById(`otp-${i}`) as HTMLInputElement;
      if (input) {
        input.value = '';
      }
    }

    // Focus first input
    document.getElementById('otp-0')?.focus();
  }

  private startCountdown(): void {
    this.countdownSubscription?.unsubscribe();

    this.countdownSubscription = interval(1000)
      .pipe(take(60))
      .subscribe(() => {
        const current = this.countdown();
        if (current > 0) {
          this.countdown.set(current - 1);
        } else {
          this.canResend.set(true);
        }
      });
  }

  private getErrorMessage(error: string): string {
    if (error.includes('invalid') || error.includes('OTP')) {
      return 'Invalid OTP code. Please try again.';
    }
    if (error.includes('expired')) {
      return 'OTP expired. Please request a new one.';
    }
    if (error.includes('attempts')) {
      return 'Too many attempts. Please try again later.';
    }
    return 'Verification failed. Please try again.';
  }
}
