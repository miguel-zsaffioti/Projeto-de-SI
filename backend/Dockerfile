FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm install
# Gera o Prisma Client com os binários corretos para Linux Alpine
RUN npx prisma generate
COPY . .
EXPOSE 3001
# Em runtime: aplica o schema no banco e inicia com hot-reload
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm run dev"]