FROM node:20-alpine

WORKDIR /app

# Default to production; pass -e NODE_ENV=development to override for local testing
ENV NODE_ENV=production

COPY package*.json ./

# --production skips devDependencies — keeps the image lean
RUN npm install --production

COPY . .

# logs/ is only used when LOG_FILE is set; harmless to create in the image
RUN mkdir -p logs

# 3000 is the PORT default; Render (and other platforms) override PORT at runtime
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["npm", "start"]
