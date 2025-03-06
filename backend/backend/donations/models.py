from django.db import models

from backend import settings

class CauseCategory(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

class Cause(models.Model):
    name = models.CharField(max_length=255)
    
    category = models.ForeignKey(CauseCategory, on_delete=models.CASCADE, related_name='causes')
    description = models.TextField(blank=True, null=True)
    active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.category.name})"

class Donor(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='donor_profile',
         null=True, 
         blank=True
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone_number = models.CharField(max_length=20) 
    address = models.CharField(max_length=255)
    postal_code = models.CharField(max_length=10)
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    iban = models.CharField(max_length=34, blank=True, null=True)
    account_holder = models.CharField(max_length=255, blank=True, null=True)
    def __str__(self):
        return f"{self.first_name} {self.last_name}"



class Donation(models.Model):
    PAYMENT_METHODS = (
        ('paypal', 'PayPal'),
        ('sepa', 'SEPA'),
    )

    FREQUENCY_CHOICES = (
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
    )

    DONATION_TYPE_CHOICES = (
        ('one-time', 'One-time'),
        ('regular', 'Regular'),
    )
    PAYMENT_STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    )

    donor = models.ForeignKey(Donor, on_delete=models.CASCADE, related_name='donations')
    donation_type = models.CharField(max_length=10, choices=DONATION_TYPE_CHOICES)
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHODS)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    payment_id = models.CharField(max_length=255, null=True, blank=True)
    frequency = models.CharField(max_length=10, choices=FREQUENCY_CHOICES, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    payment_status = models.CharField(max_length=20, default='pending')
    ip_address = models.CharField(max_length=45, null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)

    @property
    def total_amount(self):
        return sum(detail.amount * detail.quantity for detail in self.donation_details.all())

class DonationDetail(models.Model):
    donation = models.ForeignKey(Donation, on_delete=models.CASCADE, related_name='donation_details')
    cause = models.ForeignKey(Cause, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.cause.name} - {self.quantity} x {self.amount}"  

    