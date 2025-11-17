from django.shortcuts import render
from django.views.generic import TemplateView

from rest_framework import viewsets, permissions, filters
from .models import (
    Ruta, Vehiculo, Aeronave, Conductor, Piloto, 
    Despacho, Cliente, Carga
)
from .serializers import (
    RutaSerializer, VehiculoSerializer, AeronaveSerializer, ConductorSerializer, 
    PilotoSerializer, DespachoSerializer, ClienteSerializer, CargaSerializer
)

# --- Vistas Públicas (o de solo lectura) ---
# Usamos 'IsAuthenticatedOrReadOnly' para que cualquiera pueda VER,
# pero solo usuarios logueados puedan CREAR, EDITAR o BORRAR.

class RutaViewSet(viewsets.ModelViewSet):
    queryset = Ruta.objects.all()
    serializer_class = RutaSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    # Filtros y Búsqueda
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['origen', 'destino', 'tipo_transporte']
    ordering_fields = ['origen', 'distancia_km']

class VehiculoViewSet(viewsets.ModelViewSet):
    queryset = Vehiculo.objects.all()
    serializer_class = VehiculoSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['patente', 'tipo_vehiculo']

class AeronaveViewSet(viewsets.ModelViewSet):
    queryset = Aeronave.objects.all()
    serializer_class = AeronaveSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['matricula', 'tipo_aeronave']

class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre', 'rut']

class CargaViewSet(viewsets.ModelViewSet):
    queryset = Carga.objects.all()
    serializer_class = CargaSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['descripcion', 'cliente__nombre']


# --- Vistas Protegidas (Requieren JWT) ---
# Usamos 'IsAuthenticated' para que TODAS las acciones

class DespachoViewSet(viewsets.ModelViewSet):
    """
    API para registrar nuevos despachos.
    Solo usuarios autenticados pueden acceder. [cite: 40]
    """
    queryset = Despacho.objects.all()
    serializer_class = DespachoSerializer
    permission_classes = [permissions.IsAuthenticated]

class ConductorViewSet(viewsets.ModelViewSet):
    """
    API para la gestión de conductores.
    Solo personal autorizado (autenticado) puede acceder. [cite: 45]
    """
    queryset = Conductor.objects.all()
    serializer_class = ConductorSerializer
    permission_classes = [permissions.IsAuthenticated]

class PilotoViewSet(viewsets.ModelViewSet):
    """
    API para la gestión de pilotos.
    Solo personal autorizado (autenticado) puede acceder. [cite: 45]
    """
    queryset = Piloto.objects.all()
    serializer_class = PilotoSerializer
    permission_classes = [permissions.IsAuthenticated]

def home_view(request):
    # Puedes pasar datos del contexto aquí si lo necesitas
    context = {
        'page_title': 'Página de Inicio',
    }
    return render(request, 'transporte/index.html', context)

class HomeView(TemplateView):
    template_name = "transporte/index.html"

class VehiculoCRUDView(TemplateView):
    template_name = "transporte/gestionar_vehiculos.html"

class AeronaveCRUDView(TemplateView):
    template_name = "transporte/gestionar_aeronaves.html"

class RutaCRUDView(TemplateView):
    template_name = "transporte/gestionar_rutas.html"

class ConductorCRUDView(TemplateView):
    template_name = "transporte/gestionar_conductores.html"

class PilotoCRUDView(TemplateView):
    template_name = "transporte/gestionar_pilotos.html"

class DespachoCRUDView(TemplateView):
    template_name = "transporte/gestionar_despachos.html"

class ClienteCRUDView(TemplateView):
    template_name = "transporte/gestionar_clientes.html"

class CargaCRUDView(TemplateView):
    template_name = "transporte/gestionar_cargas.html"

class LoginView(TemplateView):
    template_name = "transporte/login.html"