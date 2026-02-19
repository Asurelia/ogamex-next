# ---- Stage 1: Install dependencies ----
FROM node:20-alpine AS deps
WORKDIR /app

# Install build tools for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci

# ---- Stage 2: Build TypeScript ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY ../shared ../shared

RUN npx tsc

# ---- Stage 3: Production runner ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install runtime dependencies for better-sqlite3
RUN apk add --no-cache libstdc++

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

# Create data directory for SQLite
RUN mkdir -p /app/data

RUN addgroup --system --gid 1001 gameserver
RUN adduser --system --uid 1001 colyseus
RUN chown -R colyseus:gameserver /app/data

USER colyseus

EXPOSE 2567

CMD ["node", "dist/index.js"]
