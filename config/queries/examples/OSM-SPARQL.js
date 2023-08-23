/**
 * author: Julián Rojas (julianandres.rojasmelendez@ugent.be)
 * Ghent University - imec - IDLab
 */

export default {
    virtuoso: {
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
        queries: [
            (lat1, long1, lat2, long2) => {
                // GeoSPARQL query for all osm:Nodes and their connections within the given bbox
                return `
                PREFIX osm: <https://w3id.org/openstreetmap/terms#>
                PREFIX gsp: <http://www.opengis.net/ont/geosparql#>
                PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
                PREFIX rt: <http://w3id.org/routable-tiles/terms#>
                CONSTRUCT {
                    ?nodeA gsp:asWKT ?wktA.
                    ?nodeB gsp:asWKT ?wktB.
                    ?nodeC gsp:asWKT ?wktC.
                    ?nodeD gsp:asWKT ?wktD.

                    ?nodeA rt:biLinkedTo ?nodeB.
                    ?nodeC rt:linkedTo ?nodeD.
                }
                FROM <http://belgium.roads.osm>
                WHERE {
                    # Get location of the first element of the list
                    ?way a osm:Way;
                        osm:hasNodes ?initList.
                    
                    ?initList rdf:first [ gsp:asWKT ?loc ].

                    {
                        # Get consecutive nodes with their location
                        ?nodeA ^rdf:first/rdf:rest/rdf:first ?nodeB;
                            gsp:asWKT ?wktA.

                        ?nodeB gsp:asWKT ?wktB.

                        # Make sure they are related to the local osm:Way
                        ?initList rdf:rest*/rdf:first ?nodeA.

                        # Query only for bidirectional osm:Ways
                        FILTER NOT EXISTS {
                            ?way osm:hasTag "oneway=yes".
                        }
                    }
                    UNION
                    {
                        # Get consecutive nodes with their location
                        ?nodeC ^rdf:first/rdf:rest/rdf:first ?nodeD;
                            gsp:asWKT ?wktC.

                        ?nodeD gsp:asWKT ?wktD.

                        # Make sure they are related to the local osm:Way
                        ?initList rdf:rest*/rdf:first ?nodeC.

                        # Query only for unidirectional osm:Ways
                        FILTER EXISTS {
                            ?way osm:hasTag "oneway=yes".
                        }
                    }
                    
                    # Tile GeoSPARQL filter
                    FILTER (
                        geof:sfWithin(?loc, 
                            '''
                                <http://www.opengis.net/def/crs/OGC/1.3/CRS84>
                                POLYGON ((
                                    ${long1} ${lat1}, 
                                    ${long2} ${lat1},
                                    ${long2} ${lat2}, 
                                    ${long1} ${lat2},
                                    ${long1} ${lat1}
                                ))
                            '''^^gsp:wktLiteral
                        )
                    )
                }
                `;
            }
        ]
    },
    graphdb: {
        location: (id) => {
            return `
            PREFIX osm: <https://w3id.org/openstreetmap/terms#>
            PREFIX gsp: <http://www.opengis.net/ont/geosparql#>
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            SELECT ?id ?label ?wkt
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
        queries: [
            (lat1, long1, lat2, long2) => {
                // Query without GeoSPARQL functions because it performs worse in GraphDB
                return `
                PREFIX osm: <https://w3id.org/openstreetmap/terms#>
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                PREFIX gsp: <http://www.opengis.net/ont/geosparql#>
                PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
                PREFIX rt: <http://w3id.org/routable-tiles/terms#>
                CONSTRUCT {
                    ?nodeA gsp:asWKT ?wktA.
                    ?nodeB gsp:asWKT ?wktB.
                    ?nodeC gsp:asWKT ?wktC.
                    ?nodeD gsp:asWKT ?wktD.

                    ?nodeA rt:biLinkedTo ?nodeB.
                    ?nodeC rt:linkedTo ?nodeD.
                        
                } WHERE {
                    # Get location of the first element of the list
                    ?way a osm:Way;
                        osm:hasNodes ?initList.
                    
                    ?initList rdf:first [ gsp:asWKT ?loc ].
                    
                    # Extract latitude and longitude from WKT string
                    BIND(xsd:decimal(REPLACE(STR(?loc), "^[^0-9\\.]*([0-9\\.]+) .*$", "$1")) AS ?long)
                    BIND(xsd:decimal(REPLACE(STR(?loc), "^.* ([0-9\\.]+)[^0-9\\.]*$", "$1")) AS ?lat)
                    
                    {
                        # Get consecutive nodes with their location
                        ?nodeA ^rdf:first/rdf:rest/rdf:first ?nodeB;
                            gsp:asWKT ?wktA.

                        ?nodeB gsp:asWKT ?wktB.

                        # Make sure they are related to the local osm:Way
                        ?initList rdf:rest*/rdf:first ?nodeA.

                        # Query only for bidirectional osm:Ways
                        FILTER NOT EXISTS {
                            ?way osm:hasTag "oneway=yes".
                        }
                    }
                    UNION
                    {
                        # Get consecutive nodes with their location
                        ?nodeC ^rdf:first/rdf:rest/rdf:first ?nodeD;
                            gsp:asWKT ?wktC.

                        ?nodeD gsp:asWKT ?wktD.

                        # Make sure they are related to the local osm:Way
                        ?initList rdf:rest*/rdf:first ?nodeC.

                        # Query only for unidirectional osm:Ways
                        FILTER EXISTS {
                            ?way osm:hasTag "oneway=yes".
                        }
                    }

                    # Geospatial filter
                    FILTER(?long >= ${long1} && ?long <= ${long2})
                    FILTER(?lat <= ${lat1} && ?lat >= ${lat2})
                }
                `;
            }
        ]
    }
}