# vector-tiles-interface

Web API for serving (dynamic) vector tiles.

## Run WITH Docker

This application has been _dockerized_ to facilitate its deployment. We use [`docker-compose`](https://docs.docker.com/compose/) to deploy the application together with a [NGINX](https://www.nginx.com/) instance that acts as a reverse proxy and cache manager.

To deploy follow these steps:

1. Make sure to have a recent version of [Docker](https://docs.docker.com/engine/install/) installed.

2. Define the required query(ies) depending on the storage type. For example for SPARQL-based storages, use the [sparql.js](https://github.com/julianrojas87/vector-tiles-interface/blob/main/config/queries/sparql.js) script.

3. Build and run the docker containers:

   ```bash
   docker-compose up -d
   ```

## Run WITHOUT Docker

To directly run this application you need to install first:

- [Node.js](https://nodejs.org/en/download/)  at least v12.

Then follow these steps:

1. Clone this repository:

   ```bash
   git clone https://github.com/julianrojas87/vector-tiles-interface.git
   ```

2. Go inside the cloned folder and install dependencies:

   ```bash
   npm install
   ```

3. Fill in the configuration parameters in the [`config.js`](https://github.com/julianrojas87/vector-tiles-interface/blob/main/config/config.js) file. The configuration script already contains some examples to deal with SPARQL storages.

4. Once all the configuration parameters have been filled, run the application:

   ```  bash
   node bin/serve.js
   ```

Unlike the dockerized deploy, in this way a NGINX instance is not set up automatically. Check the [`nginx.conf`](https://github.com/julianrojas87/vector-tiles-interface/blob/main/nginx/nginx.conf) file in this repository to see how it can be configured.