# Start from a Node.js ready container
FROM node:18
# Network port number
EXPOSE 3000
# Create a new directory for app files
RUN mkdir -p /opt/vector-tiles
# Set working directory in the container
WORKDIR /opt/vector-tiles
# Copy source files
COPY . /opt/vector-tiles/
# Install dependencies
RUN npm install
# Setup container's entrypoint script
RUN chmod +x run.sh 
ENTRYPOINT [ "./run.sh" ]
