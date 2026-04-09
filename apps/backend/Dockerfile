FROM node:18-alpine

WORKDIR /app

# Copy package.json
COPY package.json ./

# Install all dependencies (including devDependencies for building)
RUN npm install

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy all source code
COPY . .

# Build NestJS
RUN npx nest build

# Verify dist exists
RUN ls -la dist/

# Expose port
EXPOSE 3002

# Start the server
CMD ["node", "dist/main"]
