FROM python:3.11-slim

WORKDIR /app

# Install dependencies dulu (di-cache kalau requirements.txt ga berubah)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy semua file project
COPY . .

# Jalankan pake gunicorn (lebih proper dari flask dev server)
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", "app:app"]
