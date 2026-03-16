FROM python:3.10-slim

# Install compilers
RUN apt-get update && apt-get install -y \
    default-jdk \
    g++ \
    gcc

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Install Python dependencies
RUN pip install -r fixit-backend/requirements.txt

# Start server
CMD ["python", "FixIt-Offline-Server.py"]