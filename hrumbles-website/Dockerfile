# Stage 1: Build the website with Node
FROM node:18-alpine AS build
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build for production
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:1.25-alpine

# Clean default nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy built files only
COPY --from=build /app/dist /usr/share/nginx/html

# Expose nginx port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
