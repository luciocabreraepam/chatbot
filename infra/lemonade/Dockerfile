# Stage 1: Build Environment using Vite+ (vp)
FROM node:26-alpine AS builder
WORKDIR /app

# 1. Install the official global Vite+ CLI binary from npm registry
RUN npm i --global vite-plus

# 2. Copy the monorepo orchestration manifests from the raised host context
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json vite.config.ts* ./

# 3. Copy application package file to hydrate workspace structure
COPY apps/website/package.json ./apps/website/

# 4. Use Vite+'s native toolchain manager to safely install workspace lock dependencies
RUN vp install

# 5. Bring in your actual source components
COPY apps/website ./apps/website

# 6. Execute compilation using Vite+'s task runner (vp run)
ENV NODE_ENV=production
RUN vp run --filter website build

# Stage 2: Production Execution Runtime
FROM node:26-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy node_modules and built output bundles from the builder container cache
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/website/build ./build
COPY --from=builder /app/apps/website/package.json ./package.json

EXPOSE 3000

# Boot the React Router 7 SSR server layout using Vite+ runner execution protocols
CMD ["vp", "run", "start"]
