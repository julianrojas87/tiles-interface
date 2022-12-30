import { test } from 'tap';
import { build } from '../lib/main.js';

// Create static config always pointing to Virtuoso
const config = {
    logLevel: 'debug',
    fastifyConfig: {
        port: 3000,
        logger: true,
        pluginTimeout: 120000,
        responseHeaders: {
            'Access-Control-Allow-Origin': '*',
            'Vary': 'Accept',
            'Cache-Control': 'public, max-age=86400'
        }
    },
    storages: [
        {
            type: 'SPARQL',
            name: 'virtuoso',
            endpoint: 'https://linked.ec-dataplatform.eu/sparql',
            concurrentQueries: true,
            options: {
                infer: false,
                timeout: 0
            },
            requestHeaders: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': 'curl/7.68.0'
            },
            responseHeaders: {
                'Access-Control-Allow-Origin': '*',
                'Vary': 'Accept',
                'Cache-Control': 'public, max-age=86400'
            }
        }
    ]
}

console.log('Setting up mock server...');
const server = build(config);


test('Test Virtuoso tiles', async t => {
    // Use Fastify inject API to mock HTTP requests
    const res = await server.inject({
        method: 'GET', 
        url: '/virtuoso/12/2100/1372' 
    });
    t.equal(res.statusCode, 200, 'Virtuoso SPARQL tile request responds with 200 OK');
    t.ok(res.headers['content-type'].startsWith('application/n-triples'), 'It contains N-Triples RDF');
});