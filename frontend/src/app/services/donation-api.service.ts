import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DonationApiService {
  private apiUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) { }

  getCauses(): Observable<any> {
    return this.http.get(`${this.apiUrl}/causes/`);
  }
  getDonations(): Observable<any> {
    return this.http.get(`${this.apiUrl}/donations/`);
  }

  // createDonation(donationData: any): Observable<any> {
  //   return this.http.post(`${this.apiUrl}/donations/`, donationData);
  // }
  saveDonation(paymentMethodId: string, donationData: any, paymentType: 'paypal' | 'sepa'): Observable<any> {
    return this.http.post(`${this.apiUrl}/donations/save/`, {
      paymentMethodId,
      paymentType,
      ...donationData
    });
    
  }
  createDonation(donationData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/donations/`, donationData);
  }
  confirmPayment(donationId: number, paymentId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/donations/${donationId}/confirm_payment/`, { payment_id: paymentId });
  }

  getPaymentStatus(donationId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}//donations/${donationId}/payment_status/`);
  }
  getUserDonations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/donations/user-donations/`);
  }
}