from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RutaViewSet, VehiculoViewSet, AeronaveViewSet, ConductorViewSet, 
    PilotoViewSet, DespachoViewSet, ClienteViewSet, CargaViewSet
)

# Creamos un router que manejará las URLs de la API automáticamente
router = DefaultRouter()
router.register(r'rutas', RutaViewSet)
router.register(r'vehiculos', VehiculoViewSet)
router.register(r'aeronaves', AeronaveViewSet)
router.register(r'conductores', ConductorViewSet)
router.register(r'pilotos', PilotoViewSet)
router.register(r'despachos', DespachoViewSet)
router.register(r'clientes', ClienteViewSet)
router.register(r'cargas', CargaViewSet)

urlpatterns = [
    # Incluye todas las URLs generadas por el router
    path('', include(router.urls)),
]