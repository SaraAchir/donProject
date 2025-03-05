import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DonationApiService } from '../../services/donation-api.service';

@Component({
  selector: 'app-payment-success',
  standalone:false,
  template: `
    <div class="success-page">
      <h2>Payment Successful!</h2>
      <p>Thank you for your donation.</p>
      <div *ngIf="processingPayment">Processing your payment...</div>
    </div>
  `
})
export class PaymentSuccessComponent implements OnInit {
  processingPayment = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private donationService: DonationApiService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['paymentId']) {
        this.donationService.confirmPayment(params['donationId'], params['paymentId'])
          .subscribe({
            next: (response) => {
              this.processingPayment = false;
              // Redirect to donations list after 2 seconds
              setTimeout(() => {
                this.router.navigate(['/donations']);
              }, 2000);
            },
            error: (error) => {
              console.error('Payment confirmation error:', error);
            }
          });
      }
    });
  }
}