/**
 * author: Julián Rojas (julianandres.rojasmelendez@ugent.be)
 * Ghent University - imec - IDLab
 */

import { readFile, writeFile, access, constants } from "fs/promises";
import RBush from "rbush";
import utils from '../utils/utils.js';
import SPARQL from '../../config/queries/SPARQL.js';

let logger = null;

export async function TileGeoIndex(fastify, { storage, config }) {
    logger = utils.getLogger(config.logLevel);
    let tileIndex = null;

    if (storage.indexPath) {
        // Load index from disk
        tileIndex = await loadIndex(storage);
    } else {
        // Start index creation process (might take a while if no counts are available)
        createIndex(storage).then(index => {
            tileIndex = index;
        });
    }

    fastify.get(`/sparql/${storage.name}/tile-index`, async (request, reply) => {
        reply.headers(storage.responseHeaders);

        const threshold = request.query.threshold;
        if (threshold) {
            try {
                const path = `indexes/quad-tree-${storage.name}-${threshold}.json`;
                await access(path);
                return await readFile(path, "utf8");
            } catch {
                // Create requested tile index
                storage.geoIndex.threshold = threshold;
                return await createIndex(storage);
            }
        } else {
            if (tileIndex) {
                return tileIndex;
            } else {
                reply.code(404);
            }
        }
    });
}

async function loadIndex(storage) {
    console.time(`index_load_${storage.name}`);
    const quadTree = new RBush();
    quadTree.fromJSON(JSON.parse(await readFile(storage.geoIndex.indexPath, "utf8")));
    console.timeEnd(`index_load_${storage.name}`);

    return quadTree;
}

async function createIndex(storage) {
    // Multi-level tile count object
    let counts = null;
    if (storage.geoIndex.countsPath) {
        // Load existing counts object from disk
        console.time(`counts_load_${storage.name}`);
        counts = JSON.parse(await readFile(storage.geoIndex.countsPath, "utf8"));
        console.timeEnd(`counts_load_${storage.name}`);
    } else {
        counts = { [storage.geoIndex.Z]: {} };

        // Do a full sweep of the graph and gather the node counts (if not present yet)
        console.time(`counts_fetch_${storage.name}`);
        await fetchCounts(storage.geoIndex, counts, storage);
        console.timeEnd(`counts_fetch_${storage.name}`);

        // Aggregate node count for tiles at lower zoom levels
        console.time(`counts_aggregation_${storage.name}`);
        aggregateCounts(counts, storage);
        console.timeEnd(`counts_aggregation_${storage.name}`);

        // Write aggregated counts to disk for faster reuse
        await writeFile(`indexes/counts-${storage.name}.json`, JSON.stringify(counts), "utf8");
    }

    console.time(`tileset_calculation_${storage.name}`);
    const tileSet = await calculateTilesSet(counts, storage);
    console.timeEnd(`tileset_calculation_${storage.name}`);

    // Write aggregated counts and tile set to disk for faster reuse
    await writeFile(`indexes/counts-${storage.name}.json`, JSON.stringify(counts), "utf8");
    await writeFile(`indexes/tile-set-${storage.name}-${storage.geoIndex.threshold}.json`,
        JSON.stringify(tileSet), "utf8");

    console.time(`quadtree_indexing_${storage.name}`);
    const quadTree = new RBush();
    quadTree.load(tileSet.features.map(t => t.properties));
    console.timeEnd(`quadtree_indexing_${storage.name}`);

    // Write quad tree index to disk for faster reuse
    await writeFile(`indexes/quad-tree-${storage.name}-${storage.geoIndex.threshold}.json`,
        JSON.stringify(quadTree.toJSON()), "utf8");

    return quadTree;
}

async function calculateTilesSet(counts, storage) {
    const tileSet = {
        type: "FeatureCollection",
        features: []
    };

    // Lowest zoom level tile
    const pZ = Object.keys(counts).map(z => parseInt(z)).sort((a, b) => a - b)[0];
    const pX = Object.keys(counts[pZ]).map(x => parseInt(x)).sort((a, b) => a - b)[0];
    const pY = Object.keys(counts[pZ][pX]).map(y => parseInt(y)).sort((a, b) => a - b)[0];

    // Check if lowest zoom level tile fulfills already size target
    if (counts[pZ][pX][pY] <= storage.geoIndex.threshold) {
        tileSet.features.push(getIndexObject(pZ, pX, pY, counts[pZ][pX][pY]));
    } else {
        // Zoom-in recursively to find the largest tiles that do not exceed the size threshold
        console.time("tile_drilling");
        await drillTiles(pZ + 1, pX * 2, pY * 2, counts, storage, tileSet);
        console.timeEnd("tile_drilling");
    }

    return tileSet;
}

async function fetchCounts({ Z, minX, maxX, minY, maxY }, counts, storage) {
    // Geospatially sweep the graph and get all the node counts per tile at the configured zoom level
    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            // Skip if count is already present 
            if (!counts[Z] || !counts[Z][x] || counts[Z][x][y] === undefined) {
                const lat1 = utils.tile2lat(y, Z);
                const long1 = utils.tile2long(x, Z);
                const lat2 = utils.tile2lat(y + 1, Z);
                const long2 = utils.tile2long(x + 1, Z);

                utils.printProgress(`Visiting tile ${Z}/${x}/${y}...`);

                if (storage.type === "SPARQL") {
                    let total = 0;
                    // Handle case where multiple queries are required
                    for (const queryTemplate of SPARQL[storage.name].index) {
                        const response = JSON.parse(await utils.doSPARQLQuery({
                            source: storage.endpoint,
                            query: queryTemplate(lat1, long1, lat2, long2),
                            options: storage.options,
                            logger,
                            headers: {
                                accept: 'application/sparql-results+json',
                                ...storage.requestHeaders
                            },
                        }));

                        total += parseInt(response.results.bindings[0].count.value);
                    }

                    if (!counts[Z]) counts[Z] = {};
                    if (!counts[Z][x]) counts[Z][x] = {};

                    counts[Z][x][y] = total;
                }
            }

            // If count exceeds the known threshold and zoom is not too deep,
            // fetch the count of the current sub-tiles already
            if (counts[Z][x][y] > storage.geoIndex.threshold && Z < 18) {
                await fetchCounts({
                    Z: Z + 1,
                    minX: x * 2, maxX: (x * 2) + 2,
                    minY: y * 2, maxY: (y * 2) + 2
                }, counts, storage);
            }
        }
    }
}

function aggregateCounts(counts, storage) {
    // Zoom level at which the counting was made
    const Z = storage.geoIndex.Z;
    // Find parent geo-tile that spans the whole graph
    const { pZ } = findParentTile(storage);

    let z = Z;
    while (z > pZ) {
        let X = Object.keys(counts[z]);
        // Level-up zoom level
        const luZ = z - 1;
        counts[luZ] = {};

        for (let x of X) {
            let Y = Object.keys(counts[z][x]);
            // Level-up X tile coordinate
            const luX = Math.floor(x / 2);
            if (!counts[luZ][luX]) {
                counts[luZ][luX] = {};
            }

            for (let y of Y) {
                // Level-up Y tile coordinate
                const luY = Math.floor(y / 2);
                if (!counts[luZ][luX][luY]) {
                    counts[luZ][luX][luY] = aggregateTileCount(luZ, luX, luY, counts);
                }
            }
        }
        z--;
    }
}

function findParentTile(storage) {
    // Find all-encompassing tile
    let z = storage.geoIndex.Z;
    let x1 = storage.geoIndex.minX;
    let y1 = storage.geoIndex.minY;
    let x2 = storage.geoIndex.maxX;
    let y2 = storage.geoIndex.maxY;

    while (x1 !== x2 || y1 !== y2) {
        z--;
        x1 = Math.floor(x1 / 2);
        y1 = Math.floor(y1 / 2);
        x2 = Math.floor(x2 / 2);
        y2 = Math.floor(y2 / 2);
    }

    return { pZ: z, pX: x1, pY: y1 };
}

function aggregateTileCount(z, x, y, counts) {
    /**
     * Given a tile (z, x, y), calculate the aggregated count of its 4 sub-tiles:
     * -------------
     * |  A  |  B  |
     * |-----|-----|
     * |  C  |  D  |
     * -------------
     */

    const A = counts[z + 1][x * 2] ? counts[z + 1][x * 2][y * 2] ? counts[z + 1][x * 2][y * 2] : 0 : 0;
    const B = counts[z + 1][(x * 2) + 1] ? counts[z + 1][(x * 2) + 1][y * 2] ? counts[z + 1][(x * 2) + 1][y * 2] : 0 : 0;
    const C = counts[z + 1][x * 2] ? counts[z + 1][x * 2][(y * 2) + 1] ? counts[z + 1][x * 2][(y * 2) + 1] : 0 : 0;
    const D = counts[z + 1][(x * 2) + 1] ? counts[z + 1][(x * 2) + 1][(y * 2) + 1] ? counts[z + 1][(x * 2) + 1][(y * 2) + 1] : 0 : 0;

    return A + B + C + D;
}

function getIndexObject(z, x, y, count) {
    const minX = utils.tile2long(x, z);
    const minY = utils.tile2lat(y + 1, z);
    const maxX = utils.tile2long(x + 1, z);
    const maxY = utils.tile2lat(y, z);

    return {
        // Make an object that can be indexed by the rbush library and also be processed as GeoJSON
        type: "Feature",
        properties: {
            minX, minY,
            maxX, maxY,
            count,
        },
        geometry: {
            type: "Polygon",
            coordinates: [
                [   // Make sure it is arranged counter clockwise
                    [minX, minY],
                    [maxX, minY],
                    [maxX, maxY],
                    [minX, maxY],
                    [minX, maxY]
                ]
            ]
        }
    };
}

async function drillTiles(Z, X, Y, counts, storage, tileSet) {
    for (let x = X; x < X + 2; x++) {
        for (let y = Y; y < Y + 2; y++) {
            // Check that we have a count for this tile
            if (!counts[Z][x] || counts[Z][x][y] === undefined) {
                // Fetch count for this tile
                await fetchCounts({
                    Z,
                    minX: x, maxX: x,
                    minY: y, maxY: y
                }, counts, storage);
            }

            if (counts[Z][x][y] <= storage.geoIndex.threshold || Z >= 18) {
                // Count is below the threshold or there are multiple nodes on the same location. 
                // Proceed to add this tile to the tile set
                tileSet.features.push(getIndexObject(Z, x, y, counts[Z][x][y]));
            } else {
                // Fetch counts of the next zoom level if they are not available yet
                if (!counts[Z + 1] || !counts[Z + 1][x * 2] || counts[Z + 1][x * 2][y * 2] === undefined) {
                    await fetchCounts({
                        Z: Z + 1,
                        minX: x * 2, maxX: (x * 2) + 2,
                        minY: y * 2, maxY: (y * 2) + 2
                    }, counts, storage);
                }
                // Zoom in one more level for smaller tiles
                await drillTiles(Z + 1, x * 2, y * 2, counts, storage, tileSet);
            }
        }
    }
}