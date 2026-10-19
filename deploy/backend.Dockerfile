FROM node:22-bookworm-slim
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY backend/src ./src
COPY backend/test ./test
COPY backend/scripts ./scripts
COPY frontend/package.json /app/frontend/package.json
COPY frontend/src/features/customer/mock-data.js /app/frontend/src/features/customer/mock-data.js
ENV NODE_ENV=production TZ=Asia/Bangkok
USER node
EXPOSE 5000
CMD ["node", "src/server.js"]
