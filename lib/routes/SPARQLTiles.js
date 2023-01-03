/**
 * author: Julián Rojas (julianandres.rojasmelendez@ugent.be)
 * Ghent University - imec - IDLab
 */

import utils from '../utils/utils.js';
import SPARQL from '../../config/queries/SPARQL.js';

export async function SPARQLTiles(fastify, {storage, config}) {
    const logger = utils.getLogger(config.logLevel);
    const name = storage.name;
    const source = storage.endpoint;

    fastify.get(`/sparql/${name}/:z/:x/:y`, async (request, reply) => {
        const headers = { 
            accept: 'application/n-triples',
            ...storage.requestHeaders
        };
        const options = storage.options

        logger.info('--------------------------------------------------------------------------');
        logger.info(`Received request ${request.protocol}://${request.hostname}${request.url} with accept header ${headers.accept}`);
        const lat1 = utils.tile2lat(parseFloat(request.params.y), parseFloat(request.params.z));
        const long1 = utils.tile2long(parseFloat(request.params.x), parseFloat(request.params.z));

        const lat2 = utils.tile2lat(parseFloat(request.params.y) + 1, parseFloat(request.params.z));
        const long2 = utils.tile2long(parseFloat(request.params.x) + 1, parseFloat(request.params.z));

        const sparqlRes = [];

        if (storage.concurrentQueries) {
            await Promise.all(SPARQL[name].queries.map(async q => {
                const query = q(lat1, long1, lat2, long2);
                logger.debug(`Executing the following SPARQL query: \n${query}`);
                sparqlRes.push(await utils.doSPARQLQuery({ source, query, headers, options, logger }));
            }));
        } else {
            for (const q of SPARQL[name].queries) {
                const query = q(lat1, long1, lat2, long2);
                logger.debug(`Executing the following SPARQL query: \n${query}`);
                sparqlRes.push(await utils.doSPARQLQuery({ source, query, headers, options, logger }));
            }
        }

        reply.headers(storage.responseHeaders);
        reply.header('content-type', `${headers.accept}; charset=UTF-8`);

        return sparqlRes.join('');
    });
}