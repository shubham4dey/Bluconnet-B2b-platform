# Backend Dockerfile for Production

# ---------- Stage 1: Build the TypeScript app ----------
FROM node:18-alpine AS builder

# OpenSSL is required so Prisma can detect the correct libssl/openssl version on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files and install ALL dependencies.
# Dev dependencies (typescript, prisma) are required here to compile the app.
COPY package*.json ./
RUN npm ci

# Copy app source and Prisma schema
COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma/

# Generate the Prisma Client (uses the prisma CLI from devDependencies)
RUN npx prisma generate

# Compile TypeScript -> dist/
RUN npm run build

# ---------- Stage 2: Slim production runtime ----------
FROM node:18-alpine

# OpenSSL for Prisma runtime compatibility on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Bring over the Prisma Client generated in the builder stage
# (exact same locked version, so client and server packages always match)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Prisma schema (needed for migrations / introspection at runtime)
COPY prisma ./prisma/

# Compiled JavaScript from the builder stage
COPY --from=builder /app/dist ./dist

# Expose port (Render injects PORT; the app falls back to 4000)
EXPOSE 4000

# Start the application
CMD ["node", "dist/index.js"]
