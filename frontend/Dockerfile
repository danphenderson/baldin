# Use the official Node.js image as the base image
FROM node:20

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install npm dependencies reproducibly from the committed lockfile
RUN npm ci

# Copy the frontend source code into the container
COPY . .

EXPOSE 5173

# Start the Vite development server
CMD ["npm", "run", "dev"]
