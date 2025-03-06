import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { DonationApiService } from '../../services/donation-api.service';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';

interface CauseState {
  isSelected: boolean;
  amount: number;
  quantity: number;

}
function ibanValidator(control: AbstractControl): ValidationErrors | null {
  const iban = control.value?.replace(/\s/g, '');
  if (!iban) return null;

  // Basic IBAN format check
  const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;
  if (!ibanRegex.test(iban.toUpperCase())) {
    return { invalidFormat: true };
  }
  return null;
}

@Component({
  selector: 'app-donation-form',
  standalone: false,
  templateUrl: './donation-form.component.html',
  styleUrl: './donation-form.component.scss'
})
export class DonationFormComponent implements OnInit, OnDestroy {
  private paymentSubscription: Subscription | undefined;
  donationForm !: FormGroup;
  paymentMethods = [
    { value: 'paypal', label: 'PayPal' },
    { value: 'sepa', label: 'Bank Account (SEPA)' }
  ];
  donationTypes = [
    { value: 'one-time', label: 'don ponctuel' },
    { value: 'regular', label: 'don régulier' }
  ];
  frequencies = [
    { value: 'monthly', label: 'Mensuel' },
    { value: 'yearly', label: 'Annuel' }

  ];

  categories = [
    {
      category: "Aider l'association à exister",
      options: [
        { id: '1', name: 'Adhésion annuelle (montant libre à partir de 10€)', amount: 10 ,showQuantity :false},
        { id: '2', name: "Soutenir l'association", amount: 0,showQuantity :false }
      ]
    },
    {
      category: 'Ramadan',
      options: [
        { id: '5', name: 'Offrir un colis alimentaire spécial ramadan aux démunis du Maroc (30 € ou montant libre)', amount: 30 ,showQuantity :false},
        { id: '6', name: 'Pack ramadan (230 € pour un puits au Nepal + 5 arbres fruitiers + 3 kits scolaires)', amount: 250 ,showQuantity :true},
        { id: '7', name: ' Iftars Maroc (montant libre)', amount: 0,showQuantity :false }
      ]
    },
    {
      category: 'Aider les orphelins',
      options: [
        { id: '8', name: 'Parrainer un orphelin au Maroc (20 € mensuel / option "Opter pour un don tous les mois" à cocher)', amount: 20 ,showQuantity :true},
        { id: '9', name: 'Caisse pour les veuves et orphelins du Maroc', amount: 0 ,showQuantity :false},
        { id: '10', name: "Participer à la construction d'un orphelinat au Maroc", amount: 0,showQuantity :false }
      ]
    },
    {
      category: "Prendre en charge entièrement la construction d'un puit pour une vingtaine de famille",
      options: [
        { id: '11', name: "construction d'un puit au Nepal (160€)", amount: 160 ,showQuantity :true},
        { id: '12', name: "construction d'un puit au Bangladesh (165€)", amount: 165,showQuantity :true },
        { id: '13', name: " construction d'un puit au Sri Lanka (185€)", amount: 185 ,showQuantity :true},
        { id: '14', name: "construction d'un puit au Burma (215€)", amount: 215 ,showQuantity :true}
      ]
    },
    {
      category: "Prendre en charge entièrement la construction d'un puits pour un village",
      options: [
        { id: '15', name: '  au Niger (720 € dont 10 € de frais de transaction)', amount: 766,showQuantity :true },
        { id: '16', name: ' au Bangladesh (771 € dont 11 € de frais de transaction)', amount: 782,showQuantity :true },
        { id: '17', name: '  au Cameroun (1520 € dont 20 € de frais de transaction))', amount: 1540,showQuantity :true }
      ]
    },
    {
      category: "Participer à la construction d'un puits (montant libre)",
      options: [
        { id: '18', name: "Je participe à la construction d'un puits", amount: 0 ,showQuantity :false},
      ]
    }
      ,
    {
      category: 'Autres causes',
      options: [
        { id: '18', name: 'Donner pour les urgences médicales au Maroc', amount: 0,showQuantity :false },
        { id: '19', name: 'Participation pour les maraudes dans les hôtels sociaux', amount: 0,showQuantity :false }
      ]
    }

    
   
  ];

  selectedCauses: { [key: string]: CauseState } = {};

  causes: any[] = [];
  isLoading = false;
  isFullScreenLoading = false;

  constructor(private fb: FormBuilder, private snackBar: MatSnackBar,
    private donationApiService: DonationApiService, private router:Router) {
    this.initForm();
    this.initSelectedCauses();

  }
  ngOnInit() {
    this.loadCauses();
    this.categories.forEach(category => {
      category.options.forEach(option => {
        this.selectedCauses[option.id] = {
          isSelected: false,
          amount: option.amount || 0,
          quantity: 1
        };
      });
    });
  
  }
  ngOnDestroy() {
    if (this.paymentSubscription) {
      this.paymentSubscription.unsubscribe();
    }
  }
 
 

  private resetForm(): void {
    this.donationForm.reset();
    this.selectedCauses = {};
    this.donationForm.patchValue({
      donationType: 'one-time',
      causes: []
    });
    this.initSelectedCauses()
  }


  private initForm() {
    this.donationForm = this.fb.group({
      donor: this.fb.group({
        first_name: ['', [Validators.required, Validators.minLength(2)]],
        last_name: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        phone_number: ['', [Validators.required,
          Validators.pattern('^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$')
        ]],
        address: ['', Validators.required],
        postal_code: ['', [Validators.required, Validators.pattern('^[0-9]{5}$')]],
        city: ['', Validators.required],
        country: ['', [Validators.required, Validators.minLength(2)]],
        iban: ['', [Validators.required, ibanValidator]],
        account_holder:['', [
          Validators.required,
          Validators.pattern('^[a-zA-Z ]*$'),
          Validators.minLength(2),
          Validators.maxLength(70)
        ]],
        
      }),
      donation_type: ['one-time', Validators.required],
      payment_method: ['', Validators.required],
      frequency: [''],
      donation_details: this.fb.array([
        this.fb.group({
          cause: ['', Validators.required],
          quantity: [1, Validators.required],
          amount: ['', Validators.required]
        })
      ])
    });
  
  }
  getIbanErrorMessage() {
    const control = this.donationForm.get('iban');
    if (control?.hasError('required')) {
      return 'IBAN is required';
    }
    if (control?.hasError('invalidFormat')) {
      return 'Invalid IBAN format';
    }
    return '';
  }
  onIbanInput(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input) {
      input.value = input.value.toUpperCase();
    }
  }
  getAccountHolderErrorMessage() {

    const control = this.donationForm.get('accountHolder');
    console.log("account holder name", control)
    if (control?.hasError('required')) {
      return 'Account holder name is required';
    }
    if (control?.hasError('pattern')) {

      return 'Only letters and spaces are allowed';
    }
    if (control?.hasError('minlength')) {
      return 'Name must be at least 2 characters';
    }
    if (control?.hasError('maxlength')) {
      return 'Name cannot exceed 70 characters';
    }
    return '';
  }
 
  onPaymentMethodChange(method: string) {
    const ibanControl = this.donationForm.get('iban');
    const holderControl = this.donationForm.get('accountHolder');

    if (method === 'sepa') {
      ibanControl?.setValidators([Validators.required]);
      holderControl?.setValidators([Validators.required]);
    } else {
      ibanControl?.clearValidators();
      holderControl?.clearValidators();
    }

    ibanControl?.updateValueAndValidity();
    holderControl?.updateValueAndValidity();
  }


  getCauseAmount(causeId: string): number {
    return this.selectedCauses[causeId]?.amount || 0;
  }

  isCauseSelected(causeId: string): boolean {
    return this.selectedCauses[causeId]?.isSelected || false;
  }
  toggleCause(causeId: string, defaultAmount?: number) {
    const option = this.categories
      .flatMap(category => category.options)
      .find(opt => opt.id === causeId);

    if (option) {
      const isFixedAmount = option.amount > 0;
      this.selectedCauses[causeId] = {
        isSelected: !this.selectedCauses[causeId]?.isSelected,
        amount: isFixedAmount ? option.amount : (defaultAmount || 0),
        quantity: 1
      };
    }
  }



  updateCauseAmount(causeId: string, newAmount: number) {
    if (!isNaN(newAmount)) {
      const option = this.categories
        .flatMap(category => category.options)
        .find(opt => opt.id === causeId);

      if (option) {
        this.selectedCauses[causeId] = {
          ...this.selectedCauses[causeId],
          amount: newAmount,
          quantity: this.selectedCauses[causeId].quantity || 1
        };
      }
    }
  }
 
  loadCauses() {
    this.donationApiService.getCauses().subscribe(
      (data) => {
        this.causes = data;
      },
      (error) => {
        console.error('Error loading causes:', error);
      }
    );
  }

  validateAmount(causeId: string, amount: number): boolean {
    const option = this.categories
      .flatMap(category => category.options)
      .find(opt => opt.id === causeId);

    if (!option || !option.amount) {
      console.log("rrrrrr" + option?.amount)
      return false;
    }
    console.log(amount < option.amount)
    return amount < option.amount;
  }

  updateQuantity(causeId: string, quantity: number) {
    if (this.selectedCauses[causeId]) {
      const baseAmount = this.categories
        .flatMap(category => category.options)
        .find(opt => opt.id === causeId)?.amount || 0;

      this.selectedCauses[causeId] = {
        ...this.selectedCauses[causeId],
        quantity: quantity,
        amount: baseAmount * quantity
      };
    }
  }

  getTotalAmount(): number {
    let total = 0;
    Object.entries(this.selectedCauses).forEach(([causeId, state]) => {
      if (state?.isSelected) {
        const option = this.categories
          .flatMap(category => category.options)
          .find(opt => opt.id === causeId);

        if (option) {
          const isFixedAmount = option.amount > 0;
          const amount = isFixedAmount ? option.amount : state.amount;
          total += amount * (state.quantity || 1);
        }
      }
    });
    return total;
  }
  // When initializing causes
  private initSelectedCauses() {
    this.categories.forEach(category => {
      category.options.forEach(option => {
        this.selectedCauses[option.id] = {
          isSelected: false,
          amount: option.amount || 0,
          quantity: 1
        };
      });
    });
  }
  private getCauseName(causeId: string): string {
    return this.categories
      .flatMap(category => category.options)
      .find(option => option.id === causeId)?.name || '';
  }















 
  submitDonation() {
    console.log("donationform",this.donationForm.value)
     const data = {
      donor: {
        first_name: this.donationForm.get('donor.first_name')?.value,
        last_name:  this.donationForm.get('donor.last_name')?.value,
        email: this.donationForm.get('donor.email')?.value,
        phone_number: this.donationForm.get('donor.phone_number')?.value,
        address: this.donationForm.get('donor.address')?.value,
        postal_code: this.donationForm.get('donor.postal_code')?.value,
        city: this.donationForm.get('donor.city')?.value,
        country: this.donationForm.get('donor.country')?.value,
        iban: this.donationForm.get('donor.iban')?.value,
        account_holder: this.donationForm.get('donor.account_holder')?.value,
      },
      donation_type: this.donationForm.get('donation_type')?.value,
      payment_method: this.donationForm.get('payment_method')?.value,
      frequency: this.donationForm.get('frequency')?.value,
      donation_details:  Object.entries(this.selectedCauses)
      .filter(([_, cause]) => cause?.isSelected)
      .map(([id, cause]) => ({
        cause: id,
        amount: cause.amount,
        quantity :1
      }))
    };
   
    
    if (this.donationForm) {
      this.isLoading = true; // Pour le spinner du bouton
      this.isFullScreenLoading = true; // Pour l'overlay
      this.donationApiService.createDonation(data).subscribe({
        next: (response) => {
          if (response.payment.status === 'success') {
            if (response.payment.payment_method === 'paypal') {
              this.isFullScreenLoading = true; // Garde l'overlay pendant la redirection PayPal
              console.log("haaaaaaaaaaaah")
              // Redirect to PayPal
              window.location.href = response.payment.approval_url;
            } else {
              // For other payment methods (like SEPA)
              this.router.navigate(['/payment/success'], {
                queryParams: {
                  donationId: response.donation.id,
                  paymentId: response.payment.payment_intent_id
                }
              });
            }
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.isFullScreenLoading = false;
          console.error('Payment error:', error);
          // Handle error
        },
        complete: () => {
          this.isLoading = false;
        }
      });
    }

  }

  private handleSepaPayment(paymentData: any) {
    // Handle SEPA payment data
    console.log('SEPA payment data:', paymentData);
  }
}
  
