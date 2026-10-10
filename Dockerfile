FROM node:24-bookworm-slim
ENV NODE_ENV=production PUPPETEER_SKIP_DOWNLOAD=true BOT_BROWSER_PATH=/usr/bin/chromium BOT_DATA_DIR=/data
RUN apt-get update && apt-get install -y --no-install-recommends chromium ca-certificates fonts-liberation tini && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json .puppeteerrc.cjs ./
RUN npm ci --omit=dev
COPY app.js ./
COPY lib ./lib
COPY public ./public
COPY assets ./assets
COPY data ./data
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "app.js"]
