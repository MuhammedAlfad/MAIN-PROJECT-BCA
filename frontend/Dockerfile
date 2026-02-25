FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=development

# Install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy app source
COPY . .

EXPOSE 3000

# Start Next.js dev server bound to all interfaces
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]
