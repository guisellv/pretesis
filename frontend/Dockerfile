FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# "vite preview" sirve la carpeta dist y reenvía /api al backend (ver vite.config.ts)
EXPOSE 4173
CMD ["npm", "run", "preview"]
