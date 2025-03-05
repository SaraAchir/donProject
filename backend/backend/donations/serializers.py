from rest_framework import serializers
from .models import DonationDetail, Donor, Donation, Cause, CauseCategory

class CauseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CauseCategory
        fields = '__all__'

class CauseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Cause
        fields = ['id', 'name',  'category', 'category_name', 'description', 'active']

class DonorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Donor
        fields = '__all__'
class DonationDetailSerializer(serializers.ModelSerializer):
    cause_name = serializers.CharField(source='cause.name', read_only=True)

    class Meta:
        model = DonationDetail
        fields = ['id', 'cause', 'cause_name', 'quantity', 'amount']

class DonationSerializer(serializers.ModelSerializer):
    donor = DonorSerializer()
    donation_details = DonationDetailSerializer(many=True)
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Donation
        fields = ['id', 'donor', 'donation_type', 'payment_method', 'frequency', 
                 'created_at', 'payment_status', 'donation_details', 'total_amount'
            ]

    def create(self, validated_data):
        donor_data = validated_data.pop('donor')
        donation_details_data = validated_data.pop('donation_details')
        # Create or update donor
        donor = Donor.objects.filter(email=donor_data['email']).first()
        
        if donor:
            # Update existing donor
            for key, value in donor_data.items():
                setattr(donor, key, value)
            donor.save()
        else:
            # Create new donor
            donor = Donor.objects.create(**donor_data)

        donation = Donation.objects.create(
            donor=donor,
            **validated_data
        )
        
     
        
        for detail_data in donation_details_data:
            DonationDetail.objects.create(donation=donation, **detail_data)
        
        return donation
