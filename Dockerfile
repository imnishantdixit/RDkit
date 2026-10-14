FROM php:8.4-cli

# Install Python + RDKit dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv \
    libxrender1 libxext6 libsm6 libglib2.0-0 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# PHP dependencies (already vendored, but keep composer available)
COPY . /app

# Install RDKit (used by python/rdkit_worker.py)
RUN pip3 install --no-cache-dir --break-system-packages rdkit

ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "php -S 0.0.0.0:${PORT} -t public/"]
