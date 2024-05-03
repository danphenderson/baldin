# Use the official Node.js image as the base image
FROM node:20

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install npm dependencies
RUN npm install && npm install --force-legacy-deps react-json-view

# Copy the frontend source code into the container
COPY . .

# Set the startup command for the frontend application
CMD ["npm", "start"]
