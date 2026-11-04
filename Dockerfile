FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 CLOUD_MODE=true DATA_DIR=/var/lib/stock-calling SECRET_FILE=/var/lib/stock-calling/runtime.env
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY package*.json ./
RUN mkdir -p /var/lib/stock-calling && chown -R node:node /app /var/lib/stock-calling
USER node
EXPOSE 3000
CMD ["npm", "start"]
