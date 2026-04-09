FROM node:18-alpine

WORKDIR /app

# Copy package.json only (no lock file in this subdirectory)
COPY package.json ./

# Install all dependencies
RUN npm install

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy all source code
COPY . .

# Build NestJS
RUN npx nest build

# Expose port
EXPOSE 3002

# Start the server
CMD ["node", "dist/main"]
# Railway Dockerfile deployment
