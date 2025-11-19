FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/ecosystem.config.js ./ecosystem.config.js
EXPOSE 3000
RUN npm install pm2 -g
CMD ["pm2-runtime", "start", "ecosystem.config.js"]