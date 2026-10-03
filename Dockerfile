# ==============================================================================
# LibreM - Modern SLiMS Automation Platform Dockerfile
# Multi-stage production build (Frontend SPA + Go Core Engine + Alpine Runtime)
# ==============================================================================

# Stage 1: Build React 18 Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Cache npm dependencies
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --no-audit --prefer-offline 2>/dev/null || npm install

# Build static SPA bundle
COPY frontend/ ./
RUN npm run build

# Stage 2: Compile Statically-Linked Go Binary
FROM golang:1.22-alpine AS backend-builder
WORKDIR /app

RUN apk add --no-cache git ca-certificates tzdata

# Cache Go modules
COPY go.mod go.sum ./
RUN go mod download

# Copy source code and compiled frontend assets for go:embed
COPY . .
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Build pure static Go binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -trimpath \
    -ldflags="-w -s -extldflags '-static'" \
    -o /app/librem-bin \
    ./cmd/server

# Stage 3: Minimal, Secure Production Container
FROM alpine:3.20 AS runtime

LABEL maintainer="LibreM Project <https://github.com/XenchinRyu7/LibreM>" \
      description="LibreM - Modern High-Performance SLiMS ILS Automation Engine"

RUN apk add --no-cache ca-certificates tzdata curl

# Create unprivileged application user
RUN addgroup -S -g 1001 librem && \
    adduser -S -u 1001 -G librem -h /app librem

WORKDIR /app

# Copy binary from builder
COPY --from=backend-builder --chown=librem:librem /app/librem-bin /app/librem

# Prepare upload directory
RUN mkdir -p /app/uploads && chown -R librem:librem /app

USER librem

EXPOSE 8080

ENV PORT=8080 \
    SERVER_MODE=true \
    STORAGE_PATH=/app/uploads

# Container healthcheck against LibreM health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://127.0.0.1:8080/api/v1/health || exit 1

ENTRYPOINT ["/app/librem", "--server"]
