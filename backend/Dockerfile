# ==============================================
# 🐍 Django + SQL Server (mssql-django) en Render
# ==============================================

# ⿡ Imagen base de Python
FROM python:3.12-slim

# ⿢ Instalar dependencias del sistema y driver ODBC 18
RUN apt-get update && \
    apt-get install -y curl gnupg apt-transport-https unixodbc unixodbc-dev && \
    curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - && \
    curl https://packages.microsoft.com/config/debian/12/prod.list > /etc/apt/sources.list.d/mssql-release.list && \
    apt-get update && ACCEPT_EULA=Y apt-get install -y msodbcsql18 && \
    rm -rf /var/lib/apt/lists/*

# ⿣ Crear directorio de trabajo
WORKDIR /app

# ⿤ Copiar archivos del proyecto
COPY . .

# ⿥ Instalar dependencias de Python
RUN pip install --no-cache-dir -r requirements.txt

# ⿦ Recopilar archivos estáticos
RUN python manage.py collectstatic --noinput || true

# ⿧ Exponer el puerto usado por Gunicorn
EXPOSE 8000

# ⿨ Comando de inicio
CMD ["gunicorn", "mi_proyecto.wsgi:application", "--bind", "0.0.0.0:8000"]