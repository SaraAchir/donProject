from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import Donation, Cause, CauseCategory, Donor
from .serializers import DonationSerializer, CauseSerializer, CauseCategorySerializer, DonorSerializer
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from .services import PaymentProcessor
class CauseCategoryViewSet(viewsets.ModelViewSet):
    queryset = CauseCategory.objects.all()
    serializer_class = CauseCategorySerializer
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]

class CauseViewSet(viewsets.ModelViewSet):
    serializer_class = CauseSerializer
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = Cause.objects.filter(active=True)
        category = self.request.query_params.get('category', None)
        if category is not None:
            queryset = queryset.filter(category_id=category)
        return queryset
    

class DonorViewSet(viewsets.ModelViewSet):
    serializer_class = DonorSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        if self.request.user.is_staff:
            return Donor.objects.all()
        return Donor.objects.filter(user=self.request.user)

class DonationViewSet(viewsets.ModelViewSet):
    queryset = Donation.objects.all()
    serializer_class = DonationSerializer
    payment_processor = PaymentProcessor()
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        if self.request.user.is_staff:
            return Donation.objects.all()
        return Donation.objects.filter(donor__user=self.request.user)
    def perform_create(self, serializer):
            # Vérifier si un donateur existe déjà pour cet utilisateur
            donor = Donor.objects.filter(user=self.request.user).first()
            if not donor:
                # Créer un nouveau donateur si nécessaire
                donor = Donor.objects.create(
                    user=self.request.user,
                    email=self.request.user.email
                )
            serializer.save(donor=donor)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            # Save donation with initial status
           
             # Save donation first
            donation = serializer.save(payment_status='pending')
            
            # Update donation with IP and user agent after creation
            donation.ip_address = request.META.get('REMOTE_ADDR')
            donation.user_agent = request.META.get('HTTP_USER_AGENT')
            donation.save()
            
            # Process payment
            payment_result = self.payment_processor.handle_payment(donation)
            
            if payment_result.get('status') == 'success':
                return Response({
                    'donation': serializer.data,
                    'payment': payment_result
                }, status=status.HTTP_201_CREATED)
            
            # If payment failed, update donation status
            donation.payment_status = 'failed'
            donation.save()
            return Response({
                'error': 'Payment processing failed',
                'details': payment_result.get('message')
            }, status=status.HTTP_400_BAD_REQUEST)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def confirm_payment(self, request, pk=None):
        donation = self.get_object()
        payment_id = request.data.get('payment_id')
        
        if not payment_id:
            return Response({
                'error': 'Payment ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Update donation status
            donation.payment_status = 'completed'
            donation.payment_id = payment_id
            donation.save()
            
            return Response({
                'status': 'success',
                'message': 'Payment confirmed'
            })
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def payment_status(self, request, pk=None):
        donation = self.get_object()
        return Response({
            'status': donation.payment_status,
            'payment_id': donation.payment_id
        })
    @action(detail=False, methods=['GET'], url_path='user-donations')
    def user_donations(self, request):
        donations = Donation.objects.all().order_by('-created_at')
        serializer = self.get_serializer(donations, many=True)
        return Response(serializer.data)
    
    



