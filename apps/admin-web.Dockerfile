FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY apps/admin-shell/package.json ./apps/admin-shell/package.json
RUN mkdir -p apps/admin-shell

WORKDIR /app/apps/admin-shell
RUN npm install

WORKDIR /app
COPY apps/admin-shell ./apps/admin-shell
COPY apps/auth-center-app ./apps/auth-center-app
COPY packages/ui ./packages/ui
COPY packages/config ./packages/config

WORKDIR /app/apps/admin-shell
RUN npm run build

FROM nginx:1.27-alpine
COPY apps/admin-shell/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/admin-shell/dist /usr/share/nginx/html
