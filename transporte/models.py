from django.db import models

# 1 Modelo Ruta
# Almacena la información de las rutas
# Opciones para el campo tipo_transporte 
class Ruta(models.Model):
    TIPO_TRANSPORTE_CHOICES = [
        ('TERRESTRE', 'Terrestre'),
        ('AEREO', 'Aéreo'),
    ]

    origen = models.CharField(max_length=100)
    destino = models.CharField(max_length=100)
    tipo_transporte = models.CharField(max_length=10, choices=TIPO_TRANSPORTE_CHOICES)
    distancia_km = models.FloatField()

    def __str__(self):
        return f"{self.origen} a {self.destino} ({self.tipo_transporte})"

# 2 Modelo Vehiculo
# Información de camiones, furgones, etc
class Vehiculo(models.Model):
    patente = models.CharField(max_length=10, unique=True)
    tipo_vehiculo = models.CharField(max_length=50)
    capacidad_kg = models.IntegerField()
    activo = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.patente} ({self.tipo_vehiculo})"

# 3 Modelo Aeronave
# Datos de aviones o helicópteros
class Aeronave(models.Model):
    matricula = models.CharField(max_length=20, unique=True)
    tipo_aeronave = models.CharField(max_length=50)
    capacidad_kg = models.IntegerField()
    activo = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.matricula} ({self.tipo_aeronave})"

# 4 Modelo Conductor
# Datos del personal terrestre
class Conductor(models.Model):
    nombre = models.CharField(max_length=100)
    rut = models.CharField(max_length=12, unique=True)
    licencia = models.CharField(max_length=50)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.nombre} ({self.rut})"

# 5 Modelo Piloto
# Datos del personal aéreo
class Piloto(models.Model):
    nombre = models.CharField(max_length=100)
    rut = models.CharField(max_length=12, unique=True)
    certificacion = models.CharField(max_length=100)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.nombre} ({self.rut})"

# 6 Modelo Despacho (Central)
# Registro que relaciona todo
# Opciones para el estado del despacho 
class Despacho(models.Model):
    ESTADO_CHOICES = [
        ('PENDIENTE', 'Pendiente'),
        ('EN RUTA', 'En Ruta'),
        ('ENTREGADO', 'Entregado'),
    ]

    fecha_despacho = models.DateField()
    estado = models.CharField(max_length=10, choices=ESTADO_CHOICES, default='PENDIENTE')
    costo_envio = models.FloatField()

#Relaciones (Foreign Keys)
# Un despacho tiene una ruta. Si la ruta se borra, el despacho queda sin ruta
# Un despacho puede tener un vehículo O una aeronave, por eso son 'null=True'
# Si el vehículo se borra, el despacho queda sin vehículo (SET_NULL)
# Un despacho puede tener un conductor O un piloto.
    ruta = models.ForeignKey(Ruta, on_delete=models.SET_NULL, null=True)
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.SET_NULL, null=True, blank=True)
    aeronave = models.ForeignKey(Aeronave, on_delete=models.SET_NULL, null=True, blank=True)
    conductor = models.ForeignKey(Conductor, on_delete=models.SET_NULL, null=True, blank=True)
    piloto = models.ForeignKey(Piloto, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Despacho {self.id} - {self.ruta} - {self.estado}"

# Modelos Adicionales

# 7 Modelo Cliente
# Clientes que solicitan servicios
class Cliente(models.Model):
    nombre = models.CharField(max_length=150)
    rut = models.CharField(max_length=12, unique=True)
    telefono = models.CharField(max_length=15, blank=True)
    email = models.EmailField(blank=True)

    def __str__(self):
        return self.nombre

# 8 Modelo Carga
# Detalle de la mercancía enviada
# La carga pertenece a un despacho. Si se borra el despacho, se borra la carga (CASCADE)
# La carga pertenece a un cliente. Si se borra el cliente, la carga queda sin cliente (SET_NULL)
class Carga(models.Model):
    despacho = models.ForeignKey(Despacho, related_name='cargas', on_delete=models.CASCADE)
    cliente = models.ForeignKey(Cliente, on_delete=models.SET_NULL, null=True)
    
    descripcion = models.CharField(max_length=200)
    peso_kg = models.FloatField()
    valor_declarado = models.FloatField()

    def __str__(self):
        return f"{self.descripcion} ({self.peso_kg}kg) para Despacho {self.despacho.id}"