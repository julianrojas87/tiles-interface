/**
 * author: Julián Rojas (julianandres.rojasmelendez@ugent.be)
 * Ghent University - imec - IDLab
 */

import winston from 'winston';
import formurlencoded from 'form-urlencoded';
import { fetch as undiciFetch, Agent } from 'undici';

function getLogger(level) {
    return winston.createLogger({
        level,
        format: winston.format.simple(),
        transports: [
            new winston.transports.Console()
        ]
    });
}

function tile2long(x, z) {
    return (x / Math.pow(2, z) * 360 - 180);
}

function tile2lat(y, z) {
    var n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
    return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
}

async function doSPARQLQuery({ source, query, headers, options, logger }) {
    try {
        logger.debug(`Executing HTTP POST to ${source}`);

        const res = await undiciFetch(source, {
            method: 'POST',
            headers,
            body: formurlencoded({
                query: query.trim(),
                ...options
            }),
            dispatcher: new Agent({
                headersTimeout: 300000
            })
        });
        logger.debug(`SPARQL query response headers: ${JSON.stringify(res.headers, null, 3)}`);
        return await res.text();
    } catch (err) {
        if (err.text) {
            logger.error(`ERROR: ${await err.text()}`);
        } else {
            logger.error(err);
        }
        throw err;
    }
}

function printProgress(msg) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(msg);
}

export default {
    getLogger,
    tile2lat,
    tile2long,
    doSPARQLQuery,
    printProgress
}