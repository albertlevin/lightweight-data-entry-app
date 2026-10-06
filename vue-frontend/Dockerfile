# Build stage
FROM node:16-bullseye-slim as build-stage

WORKDIR /app
COPY . /app
RUN npm install
RUN npm run build --prod

# Production stage
FROM nginx:stable-alpine as production-stage
ARG NGINX_PORT=8080

COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
