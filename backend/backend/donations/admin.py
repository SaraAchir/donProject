
from django.contrib import admin
from .models import CauseCategory, Cause, DonationDetail, Donor, Donation

@admin.register(CauseCategory)
class CauseCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)

@admin.register(Cause)
class CauseAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'active')
    list_filter = ('category', 'active')
    search_fields = ('name',)




class DonationDetailInline(admin.TabularInline):
    model = DonationDetail
    extra = 1

@admin.register(Donation)
class DonationAdmin(admin.ModelAdmin):
    list_display = ('donor', 'donation_type', 'payment_method', 'total_amount', 'created_at')
    inlines = [DonationDetailInline]