# docker file for cuda usage
FROM nvidia/cuda:12.2.2-cudnn8-runtime-ubuntu22.04

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    gcc \
    libsndfile1 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN useradd -m fastapiuser

WORKDIR /app

COPY requirements.txt .

RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .

RUN chown -R fastapiuser:fastapiuser /app

USER fastapiuser

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
