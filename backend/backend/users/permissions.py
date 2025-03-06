from rest_framework import permissions

class IsOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Admins peuvent tout faire
        if request.user.is_staff:
            return True
        # Les utilisateurs peuvent seulement accéder à leurs propres données
        return obj == request.users
class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff    