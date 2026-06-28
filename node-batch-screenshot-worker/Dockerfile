FROM oven/bun:1.3.11

WORKDIR /app
COPY package.json ./
RUN bun install --production
COPY . .

CMD ["bun", "src/index.ts", "--targets", "targets.json", "--out", "output"]
