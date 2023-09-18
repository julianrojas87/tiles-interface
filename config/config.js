/**
 * author: Julián Rojas (julianandres.rojasmelendez@ugent.be)
 * Ghent University - imec - IDLab
 */

export const config = {
    logLevel: 'info',
    fastifyConfig: {
        port: 3000,
        logger: true,
        pluginTimeout: 120000
    },
    storages: [
        {
            type: 'SPARQL',
            name: 'ERA',
            endpoint: 'http://192.168.1.56:8890/sparql',
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
            },
            // Geo Index for ERA
            geoIndex: {
                indexPath: "indexes/quad-tree-ERA-500.json",
                countsPath: "indexes/counts-ERA.json",
                // Geospatial bounding box that covers Europe at zoom level 9
                minX: 242, maxX: 305,
                minY: 109, maxY: 203,
                Z: 9,
                threshold: 1000
            }
        },
        {
            type: 'SPARQL',
            name: 'OSM_BE',
            endpoint: 'http://192.168.1.56:8890/sparql',
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
            },
            // Geo Index for OSM Belgium
            geoIndex: {
                //indexPath: "indexes/quad-tree-OSM_BE-1000.json",
                countsPath: "indexes/counts-OSM_BE.json",
                // Geospatial bounding box that covers Belgium at zoom level 9
                minX: 8307, maxX: 8483,
                minY: 5448, maxY: 5591,
                Z: 14,
                threshold: 500
            }
        }
    ]
};
