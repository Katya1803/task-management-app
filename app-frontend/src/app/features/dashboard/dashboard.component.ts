// src/app/features/dashboard/dashboard.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService, User } from '../../core/services/auth.service';
import {MatListModule} from "@angular/material/list";

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
    MatListModule
  ],
  template: `
    <div class="dashboard-container">
      <!-- Toolbar -->
      <mat-toolbar color="primary" class="toolbar-gradient">
        <span class="toolbar-title">Task Management</span>
        <span class="spacer"></span>

        <!-- User Menu -->
        <button mat-icon-button [matMenuTriggerFor]="userMenu">
          <mat-icon>account_circle</mat-icon>
        </button>
        <mat-menu #userMenu="matMenu">
          <div class="user-info">
            <p class="user-name">{{ currentUser?.fullName }}</p>
            <p class="user-email">{{ currentUser?.email }}</p>
            <p class="user-role">{{ currentUser?.role }}</p>
          </div>
          <mat-divider></mat-divider>
          <button mat-menu-item (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span>Logout</span>
          </button>
        </mat-menu>
      </mat-toolbar>

      <!-- Main Content -->
      <div class="dashboard-content">
        <div class="welcome-section">
          <h1>Welcome back, {{ currentUser?.fullName }}! 👋</h1>
          <p class="text-gray-600">
            You are logged in with <strong>{{ currentUser?.authProvider }}</strong>
          </p>
        </div>

        <!-- Stats Cards -->
        <div class="stats-grid">
          <mat-card class="stat-card">
            <mat-card-content>
              <mat-icon class="stat-icon">task_alt</mat-icon>
              <h3>Tasks</h3>
              <p class="stat-number">0</p>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card">
            <mat-card-content>
              <mat-icon class="stat-icon">pending_actions</mat-icon>
              <h3>In Progress</h3>
              <p class="stat-number">0</p>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card">
            <mat-card-content>
              <mat-icon class="stat-icon">check_circle</mat-icon>
              <h3>Completed</h3>
              <p class="stat-number">0</p>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- User Info Card -->
        <mat-card class="info-card">
          <mat-card-header>
            <mat-card-title>Account Information</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value">{{ currentUser?.email }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Provider:</span>
              <span class="info-value">{{ currentUser?.authProvider }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Role:</span>
              <span class="info-value">{{ currentUser?.role }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email Verified:</span>
              <span class="info-value" [class.verified]="currentUser?.emailVerified">
                <mat-icon>{{ currentUser?.emailVerified ? 'check_circle' : 'cancel' }}</mat-icon>
                {{ currentUser?.emailVerified ? 'Verified' : 'Not Verified' }}
              </span>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      min-height: 100vh;
      background: #f5f5f5;
    }

    .toolbar-gradient {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .toolbar-title {
      font-size: 1.25rem;
      font-weight: 600;
    }

    .spacer {
      flex: 1 1 auto;
    }

    .user-info {
      padding: 16px;

      .user-name {
        font-weight: 600;
        font-size: 1rem;
        margin: 0 0 4px 0;
      }

      .user-email {
        color: #666;
        font-size: 0.875rem;
        margin: 0 0 4px 0;
      }

      .user-role {
        display: inline-block;
        background: #667eea;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.75rem;
        margin: 0;
      }
    }

    .dashboard-content {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .welcome-section {
      margin-bottom: 2rem;

      h1 {
        font-size: 2rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
      }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      text-align: center;

      .stat-icon {
        font-size: 3rem;
        width: 3rem;
        height: 3rem;
        color: #667eea;
      }

      h3 {
        margin: 1rem 0 0.5rem;
        color: #666;
      }

      .stat-number {
        font-size: 2rem;
        font-weight: 700;
        color: #333;
        margin: 0;
      }
    }

    .info-card {
      margin-top: 2rem;

      .info-row {
        display: flex;
        justify-content: space-between;
        padding: 0.75rem 0;
        border-bottom: 1px solid #e5e7eb;

        &:last-child {
          border-bottom: none;
        }

        .info-label {
          font-weight: 600;
          color: #666;
        }

        .info-value {
          color: #333;
          display: flex;
          align-items: center;
          gap: 0.5rem;

          &.verified {
            color: #10b981;
          }

          mat-icon {
            font-size: 1.25rem;
            width: 1.25rem;
            height: 1.25rem;
          }
        }
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;

  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        console.log('Logged out successfully');
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        console.error('Logout failed:', error);
        // Navigate anyway
        this.router.navigate(['/auth/login']);
      }
    });
  }
}
