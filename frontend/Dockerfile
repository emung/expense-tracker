# Debian-based build stage: the native TypeScript 7 compiler and Vite's bundler ship glibc binaries.
FROM node:24-slim AS build
WORKDIR /app

# .npmrc pins the public registry and exact versions inside the image too.
COPY package.json package-lock.json .npmrc ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .
RUN npm run build

FROM nginx:stable-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
