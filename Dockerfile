# Start with Bun Debian image
FROM oven/bun:debian

# Set the working directory
WORKDIR /app

# Install dependencies for Node.js installation
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 23.x
RUN curl -fsSL https://deb.nodesource.com/setup_23.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Verify versions
RUN echo "Node version: $(node --version)" && echo "Bun version: $(bun --version)"

# Copy all package files to satisfy workspace requirements
COPY package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install only backend dependencies
RUN bun install --filter "backend" --filter "!frontend"

# Copy only the backend code
COPY backend ./backend/
COPY .env.keys /app/.env.keys

# Set working directory to backend for build and run
WORKDIR /app

# Build the application
RUN bun backend:build

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables at runtime
ENV NODE_ENV=production

# Command to run the application
CMD ["bun", "run", "backend:start"]