FROM node:16-alpine3.16 AS builder

WORKDIR /src

COPY  package.json ./
COPY yarn.lock ./

# Don't generate a new lockfile
RUN yarn install --pure-lockfile
COPY . .
RUN npx prisma generate
RUN npm run-script build
# Prune dev dependencies
RUN yarn install --production

FROM node:16-alpine3.16

WORKDIR /src
COPY --from=builder /src .
ENV NODE_ENV=production
ARG BASE_URL
ENV BASE_URL=$BASE_URL
CMD ["node", "build/src/app.js"]