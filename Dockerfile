# Stage 1: Build the Angular application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (including devDependencies for build)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build for production
RUN npm run build

# Stage 2: Serve with Node (serve)
FROM node:20-alpine

RUN npm install -g serve

# Copy built app from build stage
COPY --from=build /app/dist/acm-frontend/browser /app

WORKDIR /app

EXPOSE 4200

# -s = single-page app (fallback to index.html for client-side routing)
CMD ["serve", "-s", "-l", "4200"]
