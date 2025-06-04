# Use Node.js as base with the exact version needed
FROM node:23.3.0-slim AS builder


# Install pnpm globally and necessary build tools
RUN npm install -g pnpm@9.15.4 && \
    apt-get update && \
    apt-get upgrade -y && \
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
    unzip \
    libssl-dev libsecret-1-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set Python 3 as the default python
RUN ln -sf /usr/bin/python3 /usr/bin/python

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun

# Set the working directory
WORKDIR /app

# Copy package files
COPY package.json ./
COPY frontend/package.json ./frontend/
COPY backend ./backend/
COPY shared ./shared/

# Install dependencies
RUN bun install --filter "!frontend"

# Build the backend
RUN bun backend:build

# Final runtime image
FROM node:23.3.0-slim

# Install runtime dependencies
RUN npm install -g pnpm@9.15.4 && \
    apt-get update && \
    apt-get install -y \
    git \
    python3 \
    ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy Bun executable from builder stage
COPY --from=builder /root/.bun/bin/bun /usr/local/bin/bun

# Ensure bun is executable
RUN chmod +x /usr/local/bin/bun

# Copy the built application artifacts from the builder stage
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/bun.lock ./bun.lock
COPY --from=builder /app/package.json ./package.json
# COPY --from=builder /app/frontend/package.json ./frontend/package.json # Uncomment if frontend package.json needed at runtime
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/shared/package.json ./shared/package.json
COPY --from=builder /app/backend/.env.backend.production ./backend/.env.backend.production

# Expose the port the app runs on
EXPOSE 3000

# Set the entrypoint to the bun executable
ENTRYPOINT ["/usr/local/bin/bun"]

# Default command arguments for the entrypoint
CMD ["run", "backend:start"]