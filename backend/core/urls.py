from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("iss.urls")),
    path("api-auth/", include("rest_framework.urls")),
    
    # JWT Authentication endpoints
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),  # Login
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),  # Refresh
    path("api/token/verify/", TokenVerifyView.as_view(), name="token_verify"),  # Verifică token
]

