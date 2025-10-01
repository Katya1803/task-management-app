import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MatProgressSpinnerModule],
  template: `
    <!-- ✅ Angular 16 syntax with *ngIf -->
    <div *ngIf="isRestoring()" class="loading-overlay">
      <mat-spinner diameter="60"></mat-spinner>
      <p>Restoring session...</p>
    </div>

    <!-- Main App -->
    <router-outlet></router-outlet>
  `,
  styles: [`
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.95);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 9999;

      p {
        margin-top: 1rem;
        color: #666;
        font-size: 1.1rem;
      }
    }
  `]
})
export class AppComponent {
  private authService = inject(AuthService);
  isRestoring = computed(() => this.authService.isRestoring());
}
