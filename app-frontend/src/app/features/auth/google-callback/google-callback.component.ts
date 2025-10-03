import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-google-callback',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    <div class="callback-container">
      <mat-spinner diameter="50"></mat-spinner>
      <p>Processing Google Sign-In...</p>
      @if (errorMessage) {
        <p class="error">{{ errorMessage }}</p>
        <button (click)="backToLogin()">Back to Login</button>
      }
    </div>
  `,
  styles: [`
    .callback-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      gap: 1rem;
      
      p {
        margin: 0;
        font-size: 1rem;
        color: #1F2937;
      }
      
      .error {
        color: #DC2626;
        margin-top: 1rem;
      }
      
      button {
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        background: #1976D2;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        
        &:hover {
          background: darken(#1976D2, 10%);
        }
      }
    }
  `]
})
export class GoogleCallbackComponent implements OnInit {
  errorMessage = '';
  
  private router = inject(Router);
  private authService = inject(AuthService);

  ngOnInit(): void {
    this.handleCallback();
  }

  private handleCallback(): void {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    
    const idToken = params.get('id_token');
    const state = params.get('state');
    const error = params.get('error');

    if (error) {
      this.errorMessage = 'Google Sign-In failed';
      console.error('Google OAuth error:', error);
      return;
    }

    if (!idToken) {
      this.errorMessage = 'No ID token received';
      return;
    }

    const returnUrl = state || localStorage.getItem('google_auth_return_url') || '/home';
    localStorage.removeItem('google_auth_nonce');
    localStorage.removeItem('google_auth_return_url');

    this.authService.loginWithGoogle(idToken).subscribe({
      next: () => {
        console.log('✅ Google login successful');
        this.router.navigate([returnUrl]);
      },
      error: (error) => {
        console.error('❌ Google login failed:', error);
        this.errorMessage = 'Failed to authenticate with Google';
      }
    });
  }

  backToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}