FROM ubuntu:22.04

# Set non-interactive frontend
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    openjdk-17-jdk \
    gcc \
    g++ \
    make \
    cmake \
    build-essential \
    time \
    htop \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Create sandbox user
RUN useradd -m -s /bin/bash sandbox

# Create sandbox directory
RUN mkdir -p /tmp/sandbox && chown sandbox:sandbox /tmp/sandbox

# Set working directory
WORKDIR /tmp/sandbox

# Switch to sandbox user
USER sandbox

# Default command
CMD ["/bin/bash"]
