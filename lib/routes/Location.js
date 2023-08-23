/**
 * author: Julián Rojas (julianandres.rojasmelendez@ugent.be)
 * Ghent University - imec - IDLab
 */

import utils from '../utils/utils.js';
import SPARQL from '../../config/queries/SPARQL.js';

export async function Location(fastify, { storage, config }) {
    const logger = utils.getLogger(config.logLevel);
    const name = storage.name;

    fastify.get(`/:type/${name}/location`, async (request, reply) => {
        logger.info('--------------------------------------------------------------------------');
        logger.info(`Received location request ${request.protocol}://${request.hostname}${request.url}`);

        reply.headers(storage.responseHeaders);
        reply.header('content-type', `application/json; charset=UTF-8`);

        const id = request.query.id;
        const type = request.params.type;
        let location = null;

        if (type === "sparql") {
            const source = storage.endpoint;
            const headers = {
                accept: "application/sparql-results+json",
                ...storage.requestHeaders
            };
            const options = storage.options
            const query = SPARQL[name].location(id);
            logger.debug(`Executing the following SPARQL query: \n${query}`);
            const sparqlRes = JSON.parse(await utils.doSPARQLQuery({ source, query, headers, options, logger }));
            
            location = {
                id,
                label: sparqlRes.results.bindings[0].label 
                    ? sparqlRes.results.bindings[0].label.value 
                    : `Node (${sparqlRes.results.bindings[0].wkt.value})`,
                wkt: sparqlRes.results.bindings[0].wkt.value
            };

            return location;
        } else if (type === "cypher") {
            reply.statusCode = 404;
            reply.send("Graph storage not implemented yet");
        } else if (type === "gremlin") {
            reply.statusCode = 404;
            reply.send("Graph storage not implemented yet");
        } else if (type === "s3") {
            reply.statusCode = 404;
            reply.send("Graph storage not implemented yet");
        } else {
            reply.statusCode = 400;
            reply.send("Unknown graph storage type");
        }
    });
}