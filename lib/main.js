/**
 * author: Julián Rojas (julianandres.rojasmelendez@ugent.be)
 * Ghent University - imec - IDLab
 */

import fastify from 'fastify';
import { SPARQLTiles } from './routes/SPARQLTiles.js';


export function build(config) {
    const server = fastify({
        logger: config.fastifyConfig.logger,
        pluginTimeout: config.fastifyConfig.pluginTimeout
    });

    // Register each defined storage interface
    config.storages.forEach(storage => {
        if(storage.type === 'SPARQL') {
            server.register(SPARQLTiles, { storage, config });
        } else if(storage.type === 'Cypher') {

        } else if(storage.type === 'Gremlin') {

        } else if(storage.type === 'S3') {

        }
    });

    return server;
}
