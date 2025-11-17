"""
URL configuration for logistica project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from transporte.views import home_view
from transporte import views as transporte_views
from transporte.views import LoginView

# Importaciones para JWT
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

# Importaciones para Swagger (drf-yasg)
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

# Configuración de la vista de Swagger
schema_view = get_schema_view(
   openapi.Info(
      title="Logística Global API",
      default_version='v1',
      description="Documentación de la API del proyecto de logística",
      contact=openapi.Contact(email="tu_email@ejemplo.com"),
   ),
   public=True,
   permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('', home_view, name='inicio'),
    path('', transporte_views.HomeView.as_view(), name='inicio'),
    path('login/', transporte_views.LoginView.as_view(), name='login'),
    path('vehiculos/', transporte_views.VehiculoCRUDView.as_view(), name='crud-vehiculos'),
    path('aeronaves/', transporte_views.AeronaveCRUDView.as_view(), name='crud-aeronaves'),
    path('rutas/', transporte_views.RutaCRUDView.as_view(), name='crud-rutas'),
    path('conductores/', transporte_views.ConductorCRUDView.as_view(), name='crud-conductores'),
    path('pilotos/', transporte_views.PilotoCRUDView.as_view(), name='crud-pilotos'),
    path('despachos/', transporte_views.DespachoCRUDView.as_view(), name='crud-despachos'),
    path('clientes/', transporte_views.ClienteCRUDView.as_view(), name='crud-clientes'),
    path('cargas/', transporte_views.CargaCRUDView.as_view(), name='crud-cargas'),
    path('admin/', admin.site.urls),
    
    # Las URLs de la api estara estará todo bajo /api/
    path('api/', include('transporte.urls')),

    # --- URLs de Autenticación JWT ---
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # --- URLs de Documentación (Swagger y ReDoc) ---
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]
