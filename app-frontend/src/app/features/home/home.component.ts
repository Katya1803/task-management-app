import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

// Test Service Interface
interface TestResponse {
  message: string;
  timestamp?: string;
  status?: string;
  user?: string;
  data?: any;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  // ==================== SIGNALS ====================
  testing = signal(false);
  testResult = signal<any>(null);
  testSuccess = signal(false);

  // Computed from AuthService
  currentUser = computed(() => this.authService.currentUser());
  isAuthenticated = computed(() => this.authService.isAuthenticated());

  // ==================== SERVICES ====================
  private authService = inject(AuthService);
  private router = inject(Router);

  // ==================== LIFECYCLE ====================
  ngOnInit(): void {
    console.log('🏠 Home loaded for user:', this.currentUser()?.email);
  }

  // ==================== TEST API METHODS ====================

  testHello(): void {
    this.testing.set(true);
    this.testResult.set(null);

    // Call public test endpoint (no auth required)
    fetch('http://localhost:8080/api/test/hello')
      .then(res => res.json())
      .then(data => {
        this.testing.set(false);
        this.testSuccess.set(true);
        this.testResult.set(data);
        console.log('✅ Public API test successful:', data);
      })
      .catch(error => {
        this.testing.set(false);
        this.testSuccess.set(false);
        this.testResult.set({ error: error.message });
        console.error('❌ Public API test failed:', error);
      });
  }

  testSecure(): void {
    this.testing.set(true);
    this.testResult.set(null);

    const token = this.authService.getAccessToken();

    // Call secure test endpoint (auth required)
    fetch('http://localhost:8080/api/test/secure', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        this.testing.set(false);
        this.testSuccess.set(true);
        this.testResult.set(data);
        console.log('✅ Secure API test successful:', data);
      })
      .catch(error => {
        this.testing.set(false);
        this.testSuccess.set(false);
        this.testResult.set({ error: error.message });
        console.error('❌ Secure API test failed:', error);
      });
  }

  testHealth(): void {
    this.testing.set(true);
    this.testResult.set(null);

    fetch('http://localhost:8080/api/test/health')
      .then(res => res.json())
      .then(data => {
        this.testing.set(false);
        this.testSuccess.set(true);
        this.testResult.set(data);
        console.log('✅ Health check successful:', data);
      })
      .catch(error => {
        this.testing.set(false);
        this.testSuccess.set(false);
        this.testResult.set({ error: error.message });
        console.error('❌ Health check failed:', error);
      });
  }

  testEcho(): void {
    this.testing.set(true);
    this.testResult.set(null);

    const testData = {
      message: 'Hello from Task Manager!',
      user: this.currentUser()?.email,
      timestamp: new Date().toISOString()
    };

    const token = this.authService.getAccessToken();

    fetch('http://localhost:8080/api/test/echo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testData)
    })
      .then(res => res.json())
      .then(data => {
        this.testing.set(false);
        this.testSuccess.set(true);
        this.testResult.set(data);
        console.log('✅ Echo test successful:', data);
      })
      .catch(error => {
        this.testing.set(false);
        this.testSuccess.set(false);
        this.testResult.set({ error: error.message });
        console.error('❌ Echo test failed:', error);
      });
  }

  // ==================== LOGOUT ====================
  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        console.log('👋 Logged out successfully');
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        console.error('Logout failed:', error);
        // Force navigate even if logout fails
        this.router.navigate(['/auth/login']);
      }
    });
  }

  // ==================== HELPERS ====================
  getAngularVersion(): string {
    return '19';
  }
}
