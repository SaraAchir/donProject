import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DonationFormComponent } from './components/donation-form/donation-form.component';
import { PaymentSuccessComponent } from './components/payment-success/payment-success.component';
import { DonationListComponent } from './components/donation-list/donation-list.component';

const routes: Routes = [
  { path: 'donations/new', component: DonationFormComponent },
  {
    path: 'donations',
    component: DonationListComponent
  },
  {
    path: 'payment/success',
    component: PaymentSuccessComponent
  }
 
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
