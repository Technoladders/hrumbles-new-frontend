FROM node:18.17.0

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --force --quiet

COPY . .

# ✅ NEW: Accept the build script name (default to 'build')
ARG BUILD_SCRIPT=build
ENV BUILD_SCRIPT=${BUILD_SCRIPT}

# ✅ NEW: Accept Vite Env Vars
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_KEY
# Add other VITE vars here if needed

ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_KEY=${VITE_SUPABASE_KEY}
ENV NODE_OPTIONS="--max-old-space-size=4096"

# ✅ Run the specific build script passed from GitHub Actions
RUN npm run ${BUILD_SCRIPT}

RUN npm install -g serve
EXPOSE 80
CMD ["serve", "-s", "dist", "-l", "80"]