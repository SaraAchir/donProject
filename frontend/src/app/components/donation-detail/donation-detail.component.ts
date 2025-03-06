import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-donation-detail',
  templateUrl: './donation-detail.component.html',
  styleUrls: ['./donation-detail.component.scss'],
  standalone : false
})
export class DonationDetailComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    console.log('Dialog Data:', data);

  }
}