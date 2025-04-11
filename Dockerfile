# Use a multi-stage build for efficiency
FROM oven/bun:debian AS builder

# Set the working directory
WORKDIR /app

# Install dependencies for native module compilation, based on official Eliza Dockerfile
RUN apt-get update && \
    apt-get install -y \
    git \
    python3 \
    python3-pip \
    curl \
    node-gyp \
    ffmpeg \
    libtool-bin \
    autoconf \
    automake \
    libopus-dev \
    make \
    g++ \
    build-essential \
    libcairo2-dev \
    libjpeg-dev \
    libpango1.0-dev \
    libgif-dev \
    openssl \
    libssl-dev \
    libsecret-1-dev \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Node.js 23.x
RUN curl -fsSL https://deb.nodesource.com/setup_23.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g node-gyp \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies
RUN bun install

# Copy backend code
COPY backend ./backend/

# Build the application
RUN cd backend && bun run build

# Final runtime image
FROM oven/bun:debian

# Install runtime dependencies only
RUN apt-get update && \
    apt-get install -y \
    git \
    python3 \
    ffmpeg \
    curl \
    gnupg \
    ca-certificates \
    libopus-dev \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Node.js 23.x
RUN curl -fsSL https://deb.nodesource.com/setup_23.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy built artifacts from builder stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/node_modules ./backend/node_modules

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables at runtime
ENV NODE_ENV=production

# Command to run the application
CMD ["bun", "run", "backend:start"]