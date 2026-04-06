FROM node:24-alpine AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable
WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder

ENV NEXT_PUBLIC_APP_URL=http://localhost:5000
ENV NEXT_PUBLIC_API_URL=http://localhost:5000/api
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/presales_system
ENV JWT_SECRET=docker-build-secret-with-minimum-length

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build

FROM base AS runner

ENV NODE_ENV=production
ENV PORT=5000
ENV HOSTNAME=0.0.0.0
ENV NEXT_PUBLIC_APP_URL=http://localhost:5000
ENV NEXT_PUBLIC_API_URL=http://localhost:5000/api
ENV DATABASE_URL=postgresql://presales:presales@postgres:5432/presales_system
ENV JWT_SECRET=replace-me-before-production
ENV DEV_TEST_SETUP_ENABLED=false

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs

EXPOSE 5000

CMD ["pnpm", "start"]