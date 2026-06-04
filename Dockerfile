FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy built files
COPY --from=builder /app/dist ./dist

# The app binds to port 3000 internally
EXPOSE 3000

ENV NODE_ENV=production
CMD ["npm", "start"]
