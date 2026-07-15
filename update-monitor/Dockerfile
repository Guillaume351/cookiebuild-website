FROM node:22-alpine

RUN apk add --no-cache tini \
  && addgroup -S monitor \
  && adduser -S -G monitor monitor

WORKDIR /app
COPY package.json ./
COPY src ./src

RUN mkdir /state && chown monitor:monitor /state
USER monitor
ENV NODE_ENV=production \
    UPDATE_MONITOR_HOST=0.0.0.0 \
    UPDATE_MONITOR_PORT=9420
EXPOSE 9420
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.mjs"]
