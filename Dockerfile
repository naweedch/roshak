# syntax=docker/dockerfile:1.7
# ═══════════════════════════════════════════════════════════════
# ایمیج روشاک — ساخت چندمرحله‌ای
#   target runner : وب‌سرور Next.js (خروجی standalone، کاربر غیر root)
#   target tools  : ابزارهای خط فرمان (مهاجرت پایگاه داده، کارهای دوره‌ای، ساخت مدیر)
# ═══════════════════════════════════════════════════════════════
ARG NODE_VERSION=24

# ─── وابستگی‌ها ───
FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# prisma generate (postinstall) فقط به طرح نیاز دارد؛ این نشانی ساختگی است و به هیچ پایگاه داده‌ای وصل نمی‌شود
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci --no-audit --no-fund

# ─── ساخت ───
FROM deps AS builder
# نشانی سایت هنگام build در صفحات ایستا (canonical و نقشهٔ سایت) ثبت می‌شود؛ با --build-arg مقدار واقعی را بدهید
ARG APP_URL=http://localhost:3000
ENV APP_URL=${APP_URL}
COPY . .
RUN npm run build

# ─── ابزارها (مهاجرت، seed توسعه، کارهای دوره‌ای، ساخت مدیر) ───
FROM deps AS tools
ENV NODE_ENV=production
COPY . .
RUN groupadd --system --gid 1001 roshak && useradd --system --uid 1001 --gid roshak roshak \
  && chown -R roshak:roshak /app
USER roshak
CMD ["npm", "run", "jobs:run", "--", "--loop"]

# ─── اجرای وب‌سرور ───
FROM node:${NODE_VERSION}-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    LOCAL_STORAGE_DIR=/app/storage

RUN groupadd --system --gid 1001 roshak && useradd --system --uid 1001 --gid roshak roshak \
  && mkdir -p /app/storage /app/.data && chown -R roshak:roshak /app/storage /app/.data

COPY --from=builder --chown=roshak:roshak /app/public ./public
COPY --from=builder --chown=roshak:roshak /app/.next/standalone ./
COPY --from=builder --chown=roshak:roshak /app/.next/static ./.next/static

USER roshak
EXPOSE 3000
VOLUME ["/app/storage"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
