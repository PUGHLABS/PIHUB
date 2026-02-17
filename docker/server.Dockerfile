FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm install
COPY server/ .
RUN mkdir -p /app/data
EXPOSE 3001
CMD ["npm", "run", "dev"]
