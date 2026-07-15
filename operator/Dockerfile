FROM node:22-alpine

RUN apk add --no-cache docker-cli tini \
  && addgroup -S operator \
  && adduser -S -G operator operator

WORKDIR /app
COPY package.json ./
COPY src ./src

RUN mkdir /state && chown operator:operator /state
USER operator
ENV NODE_ENV=production \
    OPERATOR_HOST=0.0.0.0 \
    OPERATOR_PORT=9410
EXPOSE 9410
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.mjs"]
