# syntax=docker/dockerfile:1
# Build: Vue SPA (Vite). Fonts are self-hosted npm packages, so the build needs no external font fetch.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Run: nginx (unprivileged) serves dist/ and proxies /api/* to the gateway on port 3000.
FROM nginxinc/nginx-unprivileged:1.30-alpine
# GATEWAY_URL is read when the container starts (envsubst on the nginx template), not at build time.
# NGINX_ENTRYPOINT_LOCAL_RESOLVERS makes the image export NGINX_LOCAL_RESOLVERS (Docker's DNS) for the template.
ENV GATEWAY_URL=http://gateway:8080 \
    TRUST_CLIENT_FORWARDED_FOR=false \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz >/dev/null 2>&1 || exit 1
