FROM node:22-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json nest-cli.json ./
COPY prisma ./prisma
COPY src ./src
COPY views ./views

RUN npx prisma generate && npm run build

EXPOSE 3080

CMD ["sh", "-c", "npx prisma db push && node dist/main"]
