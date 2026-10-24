# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS deps
WORKDIR /srv
COPY package*.json ./
RUN npm ci

FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM deps AS build
COPY . .
ARG VITE_API_BASE_URL
ARG VITE_AI_PLATFORM_URL
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /srv/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ >/dev/null || exit 1
