import stripe
from paypalcheckoutsdk.core import PayPalHttpClient, SandboxEnvironment
from paypalcheckoutsdk.orders import OrdersCreateRequest
from django.conf import settings
from datetime import datetime, timedelta

class PaymentProcessor:
    def __init__(self):
        # Initialize PayPal
        environment = SandboxEnvironment(
            client_id=settings.PAYPAL_CLIENT_ID,
            client_secret=settings.PAYPAL_CLIENT_SECRET
        )
        self.paypal_client = PayPalHttpClient(environment)
        
        # Initialize Stripe
        stripe.api_version = settings.STRIPE_API_VERSION
        stripe.api_key = settings.STRIPE_SECRET_KEY

    def handle_payment(self, donation):
        """
        Single entry point for all payment processing
        """
        try:
            if donation.payment_method == 'paypal':
                return self.process_paypal_payment(donation)
            elif donation.payment_method == 'sepa':
                return self.process_stripe_sepa(donation)
            
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }

    def process_paypal_payment(self, donation):
        """
        Handle PayPal payments (one-time and recurring)
        """
        request = OrdersCreateRequest()
        request.prefer('return=representation')

        if donation.donation_type == 'one-time':
            request_body = self._create_paypal_single_body(donation)
        else:
            request_body = self._create_paypal_subscription_body(donation)

        request.request_body(request_body)
        
        try:
            response = self.paypal_client.execute(request)
            if response.result:
                donation.payment_id = response.result.id
                donation.payment_status = 'processing'
                donation.save()
                
                return {
                    'status': 'success',
                    'payment_method': 'paypal',
                    'type': 'subscription' if donation.donation_type == 'regular' else 'single',
                    'id': response.result.id,
                    'approval_url': next(link.href for link in response.result.links if link.rel == "approve")
                }
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    def _create_paypal_single_body(self, donation):
        return {
            "intent": "CAPTURE",
            "purchase_units": [{
                "amount": {
                    "currency_code": "EUR",
                    "value": str(donation.total_amount)
                },
                "description": f"Donation {donation.id}"
            }],
            "application_context": {
                "return_url": f"{settings.FRONTEND_URL}/payment/success",
                "cancel_url": f"{settings.FRONTEND_URL}/payment/cancel",
                "brand_name": settings.ORGANIZATION_NAME
            }
        }

    def _create_paypal_subscription_body(self, donation):
        return {
            "intent": "CAPTURE",
            "application_context": {
                "return_url": f"{settings.FRONTEND_URL}/payment/subscription/success",
                "cancel_url": f"{settings.FRONTEND_URL}/payment/subscription/cancel",
                "brand_name": settings.ORGANIZATION_NAME,
                  "locale": "fr-FR",
            "shipping_preference": "NO_SHIPPING",
            "payment_method": {
                "payer_selected": "PAYPAL",
                "payee_preferred": "IMMEDIATE_PAYMENT_REQUIRED"
            }
            },
              "purchase_units": [{
            "amount": {
                "currency_code": "EUR",
                "value": str(donation.total_amount)
            },
            "description": f"Recurring donation {donation.id} - {donation.frequency}"
        }],
            "plan_id": self._get_paypal_plan_id(donation),
            "subscriber": {
                "name": {
                    "given_name": donation.donor.first_name,
                    "surname": donation.donor.last_name
                },
                "email_address": donation.donor.email
            }
        }

    def process_stripe_sepa(self, donation):
        try:
            if not donation.donor.iban or not donation.donor.account_holder:
                return {
                    'status': 'error',
                    'message': 'IBAN and Account Holder Name are required'
                }

            customer = self.get_or_create_stripe_customer(donation.donor)
            payment_method = self._create_payment_method(donation)
            
            # Attach payment method to customer
            stripe.PaymentMethod.attach(
                payment_method.id,
                customer=customer.id,
            )

            if donation.donation_type == 'regular':
                return self._create_sepa_subscription(donation, customer.id, payment_method.id)
            return self._create_sepa_payment(donation, customer.id, payment_method.id)

        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    def _create_payment_method(self, donation):
        return stripe.PaymentMethod.create(
            type='sepa_debit',
            sepa_debit={'iban': donation.donor.iban},
            billing_details={
                'name': donation.donor.account_holder,
                'email': donation.donor.email,
                'address': {
                    'line1': donation.donor.address,
                    'postal_code': donation.donor.postal_code,
                    'city': donation.donor.city,
                    'country': donation.donor.country,
                }
            }
        )

   
    def _create_sepa_subscription(self, donation, customer_id, payment_method_id):
        try:
            # First, retrieve the payment method to get SEPA details
            payment_method = stripe.PaymentMethod.retrieve(payment_method_id)

            # Set customer's default payment method
            stripe.Customer.modify(
                customer_id,
                invoice_settings={
                    'default_payment_method': payment_method_id
                }
            )

            # Create subscription
            subscription = stripe.Subscription.create(
                customer=customer_id,
                items=[{
                    'price': self._get_stripe_price_id(donation)
                }],
                payment_settings={
                    'payment_method_types': ['sepa_debit'],
                    'save_default_payment_method': 'on_subscription'
                },
                metadata={
                    'donation_id': str(donation.id),
                    'donor_email': donation.donor.email,
                    'frequency': donation.frequency,
                    'type': 'recurring'
                },
                expand=['latest_invoice.payment_intent', 'default_payment_method']
            )

            return {
                'status': 'success',
                'payment_method': 'sepa',
                'type': 'subscription',
                'subscription_id': subscription.id,
                'client_secret': subscription.latest_invoice.payment_intent.client_secret,
                'mandate_data': payment_method.sepa_debit
            }

        except stripe.error.StripeError as e:
            print(f"Stripe error: {str(e)}")
            return {
                'status': 'error',
                'message': str(e.user_message if hasattr(e, 'user_message') else e)
            }
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            return {
                'status': 'error',
                'message': 'An unexpected error occurred'
            }   
    def get_or_create_stripe_customer(self, donor):
        try:
            # Try to find existing customer
            customers = stripe.Customer.list(email=donor.email)
            if customers.data:
                return customers.data[0]
            
            # Create new customer
            return stripe.Customer.create(
                email=donor.email,
                name=f"{donor.first_name} {donor.last_name}",
                address={
                    'line1': donor.address,
                    'postal_code': donor.postal_code,
                    'city': donor.city,
                    'country': donor.country,
                }
            )
        except Exception as e:
            raise Exception(f"Error creating Stripe customer: {str(e)}")

    def _get_paypal_plan_id(self, donation):
        plan_key = f"{donation.frequency}_{donation.total_amount}"
        return settings.PAYPAL_PLAN_IDS.get(plan_key)

    def _get_stripe_price_id(self, donation):
        try:
            # Create a price dynamically
            price = stripe.Price.create(
                unit_amount=int(donation.total_amount * 100),
                currency='eur',
                recurring={
                    'interval': 'month' if donation.frequency == 'monthly' else 'year'
                },
                product=settings.STRIPE_PRODUCT_ID,  # Single product ID for all donations
                metadata={
                    'amount': str(donation.total_amount),
                    'frequency': donation.frequency
                }
            )
            return price.id
            
        except stripe.error.StripeError as e:
            print(f"Error creating price: {str(e)}")
            raise ValueError(f"Failed to create price for {donation.frequency}_{donation.total_amount}")
    def _create_sepa_payment(self, donation, customer_id, payment_method_id):
        try:
            payment_intent = stripe.PaymentIntent.create(
                amount=int(donation.total_amount * 100),
                currency='eur',
                customer=customer_id,
                payment_method=payment_method_id,
                payment_method_types=['sepa_debit'],
                confirm=False,  # Changed to false
                metadata={
                    'donation_id': str(donation.id),
                    'donor_email': donation.donor.email,
                    'type': 'single'
                }
            )

            # Confirm the payment intent separately
            payment_intent = stripe.PaymentIntent.confirm(
                payment_intent.id,
                mandate_data={
                    'customer_acceptance': {
                        'type': 'online',
                        'online': {
                            'ip_address': donation.ip_address or '127.0.0.1',
                            'user_agent': donation.user_agent or 'Mozilla/5.0'
                        }
                    }
                }
            )

            return {
                'status': 'success',
                'payment_method': 'sepa',
                'type': 'single',
                'client_secret': payment_intent.client_secret,
                'payment_intent_id': payment_intent.id
            }

        except stripe.error.StripeError as e:
            print(f"Stripe error details: {e.error}")  # Add detailed logging
            return {
                'status': 'error',
                'message': str(e.user_message if hasattr(e, 'user_message') else e)
            }
          