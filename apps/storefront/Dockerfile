FROM node:22-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json turbo.json ./
COPY apps/storefront/package.json ./apps/storefront/
COPY packages ./packages
RUN npm ci --include=dev

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx turbo run build --filter=./apps/storefront

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/storefront/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/storefront/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/storefront/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]