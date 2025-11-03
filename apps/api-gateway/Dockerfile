FROM node:18-alpine AS build
WORKDIR /app
COPY apps/api-gateway/package*.json ./
RUN npm ci --silent --include=dev
COPY apps/api-gateway ./
RUN npm run build
RUN npm prune --production --silent
FROM node:18-alpine AS runtime
ARG APP_ENV=production
ENV APP_ENV=${APP_ENV}
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY apps/api-gateway/package*.json ./package.json
EXPOSE 4000
CMD ["node", "dist/index.js"]