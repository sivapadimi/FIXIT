FROM python:3.10

# install compilers
RUN apt-get update && apt-get install -y \
    openjdk-17-jdk \
    g++ \
    gcc

WORKDIR /app

COPY . .

RUN pip install -r fixit-backend/requirements.txt

CMD ["python", "FixIt-Offline-Server.py"]