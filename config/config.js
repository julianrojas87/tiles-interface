/**
 * author: Julián Rojas (julianandres.rojasmelendez@ugent.be)
 * Ghent University - imec - IDLab
 */

export const config = {
    logLevel: 'debug',
    fastifyConfig: {
        port: 3000,
        logger: true,
        pluginTimeout: 120000
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
        },
        {
            type: 'SPARQL',
            name: 'graphdb',
            endpoint: 'http://10.2.32.149:7200/repositories/ERA-KG',
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
};