FROM node:18-alpine
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ .
EXPOSE 3000
CMD ["node", "src/index.js"]
