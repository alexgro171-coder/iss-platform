FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Dependențe sistem pentru Postgres (psycopg2) și LibreOffice pentru conversie Word->PDF
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    libreoffice-writer \
    libreoffice-common \
    fonts-liberation \
    fonts-dejavu \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app

CMD ["sh", "-c", "python manage.py migrate && python manage.py runserver 0.0.0.0:8000"]

