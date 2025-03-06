import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: false
})
export class HeaderComponent {
  constructor(private router: Router) {}

  navigateToDonations() {
    this.router.navigate(['/donations']);
  }

  navigateToNewDonation() {
    this.router.navigate(['/donations/new']);
  }
}