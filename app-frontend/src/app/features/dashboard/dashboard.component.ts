import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../core/services/auth.service';
import { TestService, TestResponse } from '../../core/services/test.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatToolbarModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  // ✅ Component signals
  testing = signal(false);
  testResult = signal<any>(null);
  testSuccess = signal(false);

  // ✅ Auth service signals (computed)
  currentUser = computed(() => this.authService.currentUser());
  isAuthenticated = computed(() => this.authService.isAuthenticated());

  private authService = inject(AuthService);
  private testService = inject(TestService);
  private router = inject(Router);

  ngOnInit(): void {
    console.log('📊 Dashboard loaded for user:', this.currentUser()?.email);
  }

  testHello(): void {
    this.testing.set(true);
    this.testResult.set(null);

    this.testService.testHello().subscribe({
      next: (response) => {
        this.testing.set(false);
        this.testSuccess.set(true);
        this.testResult.set(response);
        console.log('✅ Public API test successful:', response);
      },
      error: (error) => {
        this.testing.set(false);
        this.testSuccess.set(false);
        this.testResult.set({ error: error.message });
        console.error('❌ Public API test failed:', error);
      }
    });
  }

  testSecure(): void {
    this.testing.set(true);
    this.testResult.set(null);

    this.testService.testSecure().subscribe({
      next: (response) => {
        this.testing.set(false);
        this.testSuccess.set(true);
        this.testResult.set(response);
        console.log('✅ Secure API test successful:', response);
      },
      error: (error) => {
        this.testing.set(false);
        this.testSuccess.set(false);
        this.testResult.set({ error: error.message });
        console.error('❌ Secure API test failed:', error);
      }
    });
  }

  testHealth(): void {
    this.testing.set(true);
    this.testResult.set(null);

    this.testService.healthCheck().subscribe({
      next: (response) => {
        this.testing.set(false);
        this.testSuccess.set(true);
        this.testResult.set(response);
        console.log('✅ Health check successful:', response);
      },
      error: (error) => {
        this.testing.set(false);
        this.testSuccess.set(false);
        this.testResult.set({ error: error.message });
        console.error('❌ Health check failed:', error);
      }
    });
  }

  testEcho(): void {
    this.testing.set(true);
    this.testResult.set(null);

    const testData = {
      message: 'Hello from Frontend!',
      user: this.currentUser()?.email,
      timestamp: new Date().toISOString()
    };

    this.testService.echo(testData).subscribe({
      next: (response) => {
        this.testing.set(false);
        this.testSuccess.set(true);
        this.testResult.set(response);
        console.log('✅ Echo test successful:', response);
      },
      error: (error) => {
        this.testing.set(false);
        this.testSuccess.set(false);
        this.testResult.set({ error: error.message });
        console.error('❌ Echo test failed:', error);
      }
    });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        console.log('👋 Logged out successfully');
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        console.error('Logout failed:', error);
        this.router.navigate(['/auth/login']);
      }
    });
  }
}
