FROM node:22-alpine AS build
WORKDIR /docs
ENV ASTRO_TELEMETRY_DISABLED=1

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /docs/dist /usr/share/nginx/html

EXPOSE 4321
