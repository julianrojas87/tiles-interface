/**
 * author: Julián Rojas (julianandres.rojasmelendez@ugent.be)
 * Ghent University - imec - IDLab
 */

import fastify from 'fastify';
import { Location } from './routes/Location.js';
import { SPARQLTiles } from './routes/SPARQLTiles.js';
import { TileGeoIndex } from './routes/TileGeoIndex.js';


export function build(config) {
    const server = fastify({
        logger: config.fastifyConfig.logger,
        pluginTimeout: config.fastifyConfig.pluginTimeout
    });

    // Register each defined storage, location resolver and geospatial index interfaces
    config.storages.forEach(storage => {
        // Create and publish geospatial index if bounding box is defined
        if (storage.geoIndex) {
            server.register(TileGeoIndex, { storage, config });
        }
        
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
