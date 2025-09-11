# Use a lightweight Nginx image to serve static content
FROM nginx:1.25-alpine

# Remove the default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy your website files to the nginx public folder
COPY . /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# The default Nginx command starts the server, so no CMD is needed.