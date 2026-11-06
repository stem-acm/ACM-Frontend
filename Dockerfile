FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY angular.json tsconfig*.json .postcssrc.json ./
COPY src ./src
COPY public ./public
RUN npm run build -- --configuration production

FROM nginx:stable-alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/acm-frontend/browser/ /usr/share/nginx/html/
EXPOSE 80
