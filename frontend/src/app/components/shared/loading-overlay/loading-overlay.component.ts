import { Component } from '@angular/core';

@Component({
  selector: 'app-loading-overlay',
  standalone:false,
  template: `
    <div class="loading-overlay">
      <mat-progress-spinner 
        mode="indeterminate" 
        diameter="50"
        color="primary">
      </mat-progress-spinner>
    </div>
  `,
  styles: [`
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
  `]
})
export class LoadingOverlayComponent {}