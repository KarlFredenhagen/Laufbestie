# Multi-stage build: compile frontend + backend separately, then assemble a minimal runtime
# image with only production dependencies and the built output — no source TypeScript, no
# devDependencies, no build tools in the final image.

FROM node:24-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:24-slim AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

FROM node:24-slim AS runtime
WORKDIR /app/backend
ENV NODE_ENV=production
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=frontend-build /app/frontend/dist ../frontend/dist

# create-user.ts is run via `tsx` (kept as a real dependency, not a devDependency) rather than
# compiled — it needs the original TypeScript source (and tsconfig) alongside it, not dist.
COPY --from=backend-build /app/backend/scripts ./scripts
COPY --from=backend-build /app/backend/src ./src
COPY --from=backend-build /app/backend/tsconfig.json ./tsconfig.json

# SQLite database lives here — mount a volume onto this path so data survives container
# rebuilds/updates.
VOLUME ["/app/backend/data"]

EXPOSE 3001
CMD ["node", "dist/index.js"]
