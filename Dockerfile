# syntax=docker/dockerfile:1

# ── Build ────────────────────────────────────────────────────────────────────
# SITE_URL is the only setting needed at build time (canonical URLs, and the
# host allowed to set X-Forwarded-For). Everything else is read at runtime.
FROM node:24-alpine AS build

ARG SITE_URL="https://racecast.minarox.fr"
ENV SITE_URL=$SITE_URL \
    ASTRO_TELEMETRY_DISABLED=1

WORKDIR /app
RUN corepack enable

# Dependencies first, so editing source does not re-resolve the lockfile.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build && pnpm prune --prod


# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

USER node
EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/favicon.svg').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server/entry.mjs"]
