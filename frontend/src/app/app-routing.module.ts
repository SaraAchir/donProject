import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DonationFormComponent } from './components/donation-form/donation-form.component';
import { PaymentSuccessComponent } from './components/payment-success/payment-success.component';
import { DonationListComponent } from './components/donation-list/donation-list.component';
import { AuthGuard } from './guards/auth.guard';
import { LoginComponent } from './components/login/login.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: '/donations', pathMatch: 'full' },
  { path: 'donations/new', component: DonationFormComponent },
  {
    path: 'donations',
    component: DonationListComponent,canActivate: [AuthGuard]
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
