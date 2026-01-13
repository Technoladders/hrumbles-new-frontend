FROM node:18.17.0

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --force --quiet

COPY . .

# --- BUILD ARGUMENTS ---
ARG BUILD_SCRIPT=build
# ✅ These ARGs come from GitHub Actions
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_KEY

# --- ENVIRONMENT VARIABLES ---
# ✅ We must export them as ENV so Vite can see them during 'npm run build'
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_KEY=$VITE_SUPABASE_KEY
ENV NODE_OPTIONS="--max-old-space-size=4096"

# --- DEBUGGING (Optional) ---
# Print the URL during build to verify it exists (It will show in GitHub logs)
RUN echo "Building with Supabase URL: $VITE_SUPABASE_URL"

# Build the application
RUN npm run ${BUILD_SCRIPT}

RUN npm install -g serve
EXPOSE 80
CMD ["serve", "-s", "dist", "-l", "80"]