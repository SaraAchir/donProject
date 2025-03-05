export interface Donation {
    id?: number;
    amount: number;
    donorName: string;
    email: string;
    date: Date;
    category: string;
    description?: string;
    status: 'pending' | 'completed' | 'cancelled';
  }

  export interface DonationData {
    amount: number;
    email: string;
    firstName: string;
    phoneNumber?: string;
    paymentType: 'paypal' | 'sepa';
    frequency?: string;
    isRecurring?: boolean;
  }