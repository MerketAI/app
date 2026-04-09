FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies
RUN npm install --ignore-scripts

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code
COPY . .

# Build NestJS
RUN npx nest build

# Expose port
EXPOSE 3002

# Start the server
CMD ["node", "dist/main"]
