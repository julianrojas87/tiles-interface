/**
 * author: Julián Rojas (julianandres.rojasmelendez@ugent.be)
 * Ghent University - imec - IDLab
 */

import fastify from 'fastify';
import { Location } from './routes/Location.js';
import { SPARQLTiles } from './routes/SPARQLTiles.js';


export function build(config) {
    const server = fastify({
        logger: config.fastifyConfig.logger,
        pluginTimeout: config.fastifyConfig.pluginTimeout
    });

    // Register each defined storage and location resolver interfaces
    config.storages.forEach(storage => {
        if (storage.type === 'SPARQL') {
            server.register(Location, { storage, config });
            server.register(SPARQLTiles, { storage, config });
        } else if (storage.type === 'Cypher') {
            server.register(Location, { storage, config });
        } else if (storage.type === 'Gremlin') {
            server.register(Location, { storage, config });
        } else if (storage.type === 'S3') {

        }
    });

    return server;
}
