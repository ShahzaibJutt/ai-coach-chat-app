# Use Python 3.13 slim image as base
FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Set environment variables to prevent Python from writing pyc files and to flush output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Install necessary packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Download and run the uv installer
ADD https://astral.sh/uv/install.sh /uv-installer.sh
RUN sh /uv-installer.sh && rm /uv-installer.sh

# Ensure the installed binary is on the PATH
ENV PATH="/root/.local/bin/:$PATH"

# Copy dependency files (excluding run.py since it's not used)
COPY pyproject.toml .python-version uv.lock ./

# Copy the FastAPI application code
COPY ./app ./app

# Install dependencies using uv
RUN uv sync --frozen

# (Optional) Expose port 8000 for uvicorn
EXPOSE 8000

# Run the FastAPI app with uvicorn in reload mode
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

