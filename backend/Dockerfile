# ==============================================
# 🐍 Django + SQL Server (mssql-django) en Render
# ==============================================

FROM python:3.12-bullseye

# Evita prompts de apt
ENV DEBIAN_FRONTEND=noninteractive

# Instalar dependencias del sistema y driver ODBC 18
RUN apt-get update && \
    apt-get install -y curl gnupg apt-transport-https unixodbc unixodbc-dev && \
    curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - && \
    curl https://packages.microsoft.com/config/debian/11/prod.list > /etc/apt/sources.list.d/mssql-release.list && \
    apt-get update && ACCEPT_EULA=Y apt-get install -y msodbcsql18 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

RUN pip install --no-cache-dir -r requirements.txt

RUN python manage.py collectstatic --noinput || true

EXPOSE 8000

CMD ["gunicorn", "mi_proyecto.wsgi:application", "--bind", "0.0.0.0:8000"]