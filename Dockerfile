# Start from a Node.js ready container
FROM node:19
# Network port number
EXPOSE 3000
# Create a new directory for app files
RUN mkdir -p /opt/tile-interface
# Set working directory in the container
WORKDIR /opt/tile-interface
# Copy source files
COPY . /opt/tile-interface/
# Install dependencies
RUN npm install
# Setup container's entrypoint script
RUN chmod +x run.sh 
ENTRYPOINT [ "./run.sh" ]
