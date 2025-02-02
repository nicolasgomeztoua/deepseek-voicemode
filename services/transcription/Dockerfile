FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file first
COPY requirements.txt .

# Install NumPy 1.x explicitly first to avoid conflicts
RUN pip install --no-cache-dir "numpy<2"

# Now install the rest of the dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ src/

EXPOSE 8000

CMD ["python", "src/main.py"]
