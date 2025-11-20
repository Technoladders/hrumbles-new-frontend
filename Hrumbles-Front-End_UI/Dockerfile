FROM node:18.17.0

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./
RUN npm ci --silent

COPY . .

ENV NODE_OPTIONS="--max-old-space-size=2048"

RUN npm run build

# install serve (only if you need it)
RUN npm install -g serve --silent

EXPOSE 80

CMD ["serve", "-s", "dist", "-l", "80"]
