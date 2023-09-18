/**
 * author: Julián Rojas (julianandres.rojasmelendez@ugent.be)
 * Ghent University - imec - IDLab
 */

export default {
    OSM_BE: {
        location: (id) => {
            return `
            PREFIX osm: <https://w3id.org/openstreetmap/terms#>
            PREFIX gsp: <http://www.opengis.net/ont/geosparql#>
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            SELECT ?id ?label ?wkt
            FROM <http://belgium.roads.osm>
            WHERE {
                BIND(<${id}> AS ?id)
                ?id a osm:Node;
                    gsp:asWKT ?wkt.

                OPTIONAL {
                    ?id ^rdf:first/^rdf:rest*/^osm:hasNodes [ osm:name ?label ].
                }
            }
            `
        },
        index: [
            (lat1, long1, lat2, long2) => {
                // Query to get the node count of a given tile (geospatial bounding box)
                return `
                PREFIX osm: <https://w3id.org/openstreetmap/terms#>
                PREFIX wgs: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
                SELECT (COUNT(?id) AS ?count)
                FROM <http://belgium.roads.osm>
                WHERE {
                    # Node that belongs to the tile in question
                    ?id a osm:Node;
                        wgs:lat ?lat;
                        wgs:long ?long.

                    # Select only Nodes that are part of certain types of Ways
                    VALUES ?roadTypes { 
                        osm:Motorway 
                        osm:Trunk 
                        osm:Primary 
                        osm:Secondary
                        osm:Tertiary
                        osm:Residential 
                        osm:Unclassified
                        osm:Crossing
                    }
                    
                    ?way a osm:Way;
                        osm:highway ?roadTypes;
                        osm:hasNodes ?nodeList.

                    # Make sure the tile node is part of the Ways we want
                    ?nodeList rdf:rest*/rdf:first ?id.

                    # Tile geospatial filter
                    FILTER(?long >= ${long1} && ?long <= ${long2})
                    FILTER(?lat <= ${lat1} && ?lat >= ${lat2})
                }
                `;
            }
        ],
        queries: [
            (lat1, long1, lat2, long2) => {
                // Query for all osm:Nodes and their unidirectional connections starting from the given tile
                return `
                PREFIX osm: <https://w3id.org/openstreetmap/terms#>
                PREFIX gsp: <http://www.opengis.net/ont/geosparql#>
                PREFIX wgs: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
                PREFIX rt: <http://w3id.org/routable-tiles/terms#>
                CONSTRUCT {
                    ?node gsp:asWKT ?wkt;
                        rt:linkedTo ?n2.

                    ?n2 gsp:asWKT ?wkt2.
                }
                FROM <http://belgium.roads.osm>
                WHERE {
                    # Node that belongs to the tile in question
                    ?node a osm:Node;
                        wgs:lat ?lat;
                        wgs:long ?long;
                        gsp:asWKT ?wkt.

                # Select only Nodes that are part of certain types of Ways
                    VALUES ?roadTypes { 
                        osm:Motorway 
                        osm:Trunk 
                        osm:Primary 
                        osm:Secondary
                        osm:Tertiary
                        osm:Residential 
                        osm:Unclassified
                        osm:Crossing
                    }
                    
                    ?way a osm:Way;
                        osm:highway ?roadTypes;
                        osm:hasNodes ?nodeList.

                    # Make sure the tile node is part of the Ways we want
                    ?nodeList rdf:rest*/rdf:first ?node.
                    
                    # Get consecutive nodes that are unidirectional
                    ?way osm:hasTag "oneway=yes".

                    ?n2 a osm:Node;
                        gsp:asWKT ?wkt2.

                    ?node ^rdf:first/rdf:rest/rdf:first ?n2.
                    
                    # Tile geospatial filter
                    FILTER(?long >= ${long1} && ?long <= ${long2})
                    FILTER(?lat <= ${lat1} && ?lat >= ${lat2})
                }
                `;
            },
            (lat1, long1, lat2, long2) => {
                // SPARQL query for all osm:Nodes and their bidirectional connections starting from the given tile
                return `
                PREFIX osm: <https://w3id.org/openstreetmap/terms#>
                PREFIX gsp: <http://www.opengis.net/ont/geosparql#>
                PREFIX wgs: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
                PREFIX rt: <http://w3id.org/routable-tiles/terms#>
                CONSTRUCT {
                    ?node gsp:asWKT ?wkt;
                        rt:biLinkedTo ?n2.

                    ?n2 gsp:asWKT ?wkt2.
                }
                FROM <http://belgium.roads.osm>
                WHERE {
                    # Node that belongs to the tile in question
                    ?node a osm:Node;
                        wgs:lat ?lat;
                        wgs:long ?long;
                        gsp:asWKT ?wkt.

                # Select only Nodes that are part of certain types of Ways
                    VALUES ?roadTypes { 
                        osm:Motorway 
                        osm:Trunk 
                        osm:Primary 
                        osm:Secondary
                        osm:Tertiary
                        osm:Residential 
                        osm:Unclassified
                        osm:Crossing
                    }
                    
                    ?way a osm:Way;
                        osm:highway ?roadTypes;
                        osm:hasNodes ?nodeList.

                    # Make sure the tile node is part of the Ways we want
                    ?nodeList rdf:rest*/rdf:first ?node.
                    
                    
                    # Get consecutive nodes that are bidirectional
                    FILTER NOT EXISTS { ?way osm:hasTag "oneway=yes" }

                    ?n2 a osm:Node;
                        gsp:asWKT ?wkt2.

                    ?node ^rdf:first/rdf:rest/rdf:first ?n2.
                    
                    # Tile geospatial filter
                    FILTER(?long >= ${long1} && ?long <= ${long2})
                    FILTER(?lat <= ${lat1} && ?lat >= ${lat2})
                }
                `
            },
            (lat1, long1, lat2, long2) => {
                // Query for incoming bidirectional node connections at the border of the tile
                return `
                PREFIX osm: <https://w3id.org/openstreetmap/terms#>
                PREFIX gsp: <http://www.opengis.net/ont/geosparql#>
                PREFIX wgs: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
                PREFIX rt: <http://w3id.org/routable-tiles/terms#>
                CONSTRUCT {
                    ?nodeOut gsp:asWKT ?wkt;
                        rt:linkedTo ?nodeIn.
                }
                FROM <http://belgium.roads.osm>
                WHERE {
                    # Node that sitting just outside the tile in question
                    ?nodeOut a osm:Node;
                        wgs:lat ?latOut;
                        wgs:long ?longOut;
                        gsp:asWKT ?wkt.

                # Select only Nodes that are part of certain types of Ways
                    VALUES ?roadTypes { 
                        osm:Motorway 
                        osm:Trunk 
                        osm:Primary 
                        osm:Secondary
                        osm:Tertiary
                        osm:Residential 
                        osm:Unclassified
                        osm:Crossing
                    }
                    
                    ?way a osm:Way;
                        osm:highway ?roadTypes;
                        osm:hasNodes ?nodeList.

                    # Make sure the node is part of the Ways we want
                    ?nodeList rdf:rest*/rdf:first ?nodeOut.
                    
                    # Get consecutive nodes that are unidirectional
                    ?way osm:hasTag "oneway=yes".

                    ?nodeIn a osm:Node;
                        wgs:lat ?latIn;
                        wgs:long ?longIn.

                    ?nodeOut ^rdf:first/rdf:rest/rdf:first ?nodeIn.

                    
                    # Conditions for node to be inside the tile in question
                    FILTER(?longIn >= ${long1} && ?longIn <= ${long2})
                    FILTER(?latIn <= ${lat1} && ?latIn >= ${lat2})
        
                    # Condition for node to be outside the tile in question
                    FILTER(?longOut < ${long1} || ?longOut > ${long2} || ?latOut > ${lat1} || ?latOut < ${lat2})
                }
                `;
            },
            (lat1, long1, lat2, long2) => {
                // Query for incoming unidirectional node connections at the border of the tile
                return `
                PREFIX osm: <https://w3id.org/openstreetmap/terms#>
                PREFIX gsp: <http://www.opengis.net/ont/geosparql#>
                PREFIX wgs: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
                PREFIX rt: <http://w3id.org/routable-tiles/terms#>
                CONSTRUCT {
                    ?nodeOut gsp:asWKT ?wkt;
                        rt:biLinkedTo ?nodeIn.
                }
                FROM <http://belgium.roads.osm>
                WHERE {
                    # Node that sitting just outside the tile in question
                    ?nodeOut a osm:Node;
                        wgs:lat ?latOut;
                        wgs:long ?longOut;
                        gsp:asWKT ?wkt.

                # Select only Nodes that are part of certain types of Ways
                    VALUES ?roadTypes { 
                        osm:Motorway 
                        osm:Trunk 
                        osm:Primary 
                        osm:Secondary
                        osm:Tertiary
                        osm:Residential 
                        osm:Unclassified
                        osm:Crossing
                    }
                    
                    ?way a osm:Way;
                        osm:highway ?roadTypes;
                        osm:hasNodes ?nodeList.

                    # Make sure the node is part of the Ways we want
                    ?nodeList rdf:rest*/rdf:first ?nodeOut.
                    
                    # Get consecutive nodes that are bidirectional
                    FILTER NOT EXISTS { ?way osm:hasTag "oneway=yes" }

                    ?nodeIn a osm:Node;
                        wgs:lat ?latIn;
                        wgs:long ?longIn.

                    ?nodeOut ^rdf:first/rdf:rest/rdf:first ?nodeIn.

                    
                    # Conditions for node to be inside the tile in question
                    FILTER(?longIn >= ${long1} && ?longIn <= ${long2})
                    FILTER(?latIn <= ${lat1} && ?latIn >= ${lat2})
        
                    # Condition for node to be outside the tile in question
                    FILTER(?longOut < ${long1} || ?longOut > ${long2} || ?latOut > ${lat1} || ?latOut < ${lat2})
                }
                `;
            }
        ]
    }
}