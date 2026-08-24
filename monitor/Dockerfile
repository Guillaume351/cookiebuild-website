FROM node:24.18.0-alpine

WORKDIR /app

COPY --chown=node:node monitor/package*.json ./
COPY --chown=node:node monitor/src ./src

ENV NODE_ENV=production
EXPOSE 8080

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/livez').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "src/monitor.mjs"]
