from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DonationViewSet, CauseViewSet, CauseCategoryViewSet, DonorViewSet

router = DefaultRouter()
router.register(r'causes', CauseViewSet)
router.register(r'categories', CauseCategoryViewSet)
router.register(r'donors', DonorViewSet)
router.register('donations', DonationViewSet, basename='donations')

urlpatterns = [
    path('', include(router.urls)),
]