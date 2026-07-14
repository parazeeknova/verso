FROM oven/bun:slim AS deps
WORKDIR /app
COPY package.json bun.lock* ./
COPY packages/weby/package.json ./packages/weby/
COPY packages/backy/package.json ./packages/backy/
COPY packages/native/package.json ./packages/native/
RUN bun install --frozen-lockfile --filter @verso/weby

FROM oven/bun:slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock* ./
COPY packages/weby ./packages/weby
COPY lerna.json nx.json ./
RUN bun run --cwd packages/weby build

FROM node:25-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080
COPY --from=build /app/packages/weby/.output ./.output
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/').then((r)=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", ".output/server/index.mjs"]
