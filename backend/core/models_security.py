# core/models_security.py
from django.db import models

class Usuario(models.Model):
    id_usuario = models.AutoField(primary_key=True)
    username = models.CharField(max_length=50, unique=True)
    password_hash = models.CharField(max_length=255)
    nombre_completo = models.CharField(max_length=100)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField()
    usuario_creacion = models.CharField(max_length=50)
    fecha_modificacion = models.DateTimeField(null=True, blank=True)
    usuario_modificacion = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        db_table = 'dbo.usuarios'
        managed = False  # la tabla ya existe en SQL Server

class Rol(models.Model):
    id_rol = models.AutoField(primary_key=True)
    nombre_rol = models.CharField(max_length=50, unique=True)
    descripcion = models.CharField(max_length=200, null=True, blank=True)

    class Meta:
        db_table = 'dbo.roles'
        managed = False

class Permiso(models.Model):
    id_permiso = models.AutoField(primary_key=True)
    codigo = models.CharField(max_length=100, unique=True)
    descripcion = models.CharField(max_length=200, null=True, blank=True)

    class Meta:
        db_table = 'dbo.permisos'
        managed = False

class RolPermiso(models.Model):
    id_rol = models.IntegerField()
    id_permiso = models.IntegerField()

    class Meta:
        db_table = 'dbo.rol_permisos'
        managed = False
        unique_together = (('id_rol', 'id_permiso'),)

class UsuarioRol(models.Model):
    id_usuario = models.IntegerField()
    id_rol = models.IntegerField()

    class Meta:
        db_table = 'dbo.usuario_roles'
        managed = False
        unique_together = (('id_usuario', 'id_rol'),)
