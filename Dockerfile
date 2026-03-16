FROM python:3.10

# Install compilers
RUN apt-get update && apt-get install -y \
    openjdk-17-jdk \
    g++ \
    gcc

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Install Python dependencies
RUN pip install -r fixit-backend/requirements.txt

# Start your server
CMD ["python", "FixIt-Offline-Server.py"]