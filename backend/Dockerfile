# Build context is the repository root (see docker-compose.yml): the npm
# workspace lockfile lives there.
FROM node:22-alpine AS build
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci --workspace backend --include-workspace-root
COPY backend ./backend
RUN npm run build -w backend && npm prune --omit=dev

FROM node:22-alpine
# git is core: repos ARE git dirs.
RUN apk add --no-cache git
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/dist ./backend/dist
WORKDIR /app/backend
ENV PORT=8901 DATA_DIR=/data
VOLUME /data
EXPOSE 8901
# Run as uid 1000: matches the owner of ./data on the host, so git repos
# created outside the container are not flagged as "dubious ownership".
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8901/api/health || exit 1
CMD ["node", "dist/index.js"]
