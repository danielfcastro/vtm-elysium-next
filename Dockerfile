# Stage 1: Install dependencies
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Build the application
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set dummy env vars for build (actual values come from docker-compose)
ENV DATABASE_URL=postgres://dummy:dummy@localhost:5432/dummy
ENV JWT_SECRET=dummy
ENV JWT_EXPIRES_IN=365d

RUN npm run build

# Stage 3: Production runner
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/server ./.next/server
COPY --from=builder /app/package.json ./
COPY --from=builder /app/migrations ./migrations

# Create public folder if not exists
RUN mkdir -p public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
