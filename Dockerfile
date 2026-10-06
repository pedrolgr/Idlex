# ---------------------------------------------
# 1. Base com Node.js e pnpm habilitado
# ---------------------------------------------
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# ---------------------------------------------
# 2. Builder: dependências e compilação
# ---------------------------------------------
FROM base AS builder

# Instala ferramentas necessárias para compilar pacotes nativos (ex: argon2)
RUN apk add --no-cache python3 make g++

# Copia arquivos de configuração do workspace
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/game-core/package.json ./packages/game-core/
COPY packages/huntera-client/package.json ./packages/huntera-client/
COPY packages/protocol/package.json ./packages/protocol/

# Instala todas as dependências do monorepo
RUN pnpm install --frozen-lockfile

# Copia o código-fonte completo
COPY . .

# Compila todos os pacotes e a API
ENV NODE_ENV=production
RUN pnpm build

# Poda dependências para manter apenas produção
RUN pnpm prune --prod

# ---------------------------------------------
# 3. Runner: imagem final enxuta de produção
# ---------------------------------------------
FROM base AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copia apenas as dependências podadas e os arquivos compilados/estáticos
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["pnpm", "--filter", "@idlex/api", "start"]
