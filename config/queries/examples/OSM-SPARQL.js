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
                PREFIX wgs: <http://www.w3.org/2003/01/geo/wgs84_pos#>
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
                    
                    ?initList rdf:first [ wgs:lat ?lat; wgs:long ?long ].

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
                    
                    # Tile geospatial filter
                    FILTER(?long >= ${long1} && ?long <= ${long2})
                    FILTER(?lat <= ${lat1} && ?lat >= ${lat2})
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
                return `
                PREFIX osm: <https://w3id.org/openstreetmap/terms#>
                PREFIX gsp: <http://www.opengis.net/ont/geosparql#>
                PREFIX wgs: <http://www.w3.org/2003/01/geo/wgs84_pos#>
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
                    
                    ?initList rdf:first [ wgs:lat ?lat; wgs:long ?long ].

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
                    
                    # Tile geospatial filter
                    FILTER(?long >= ${long1} && ?long <= ${long2})
                    FILTER(?lat <= ${lat1} && ?lat >= ${lat2})
                }
                `;
            }
        ]
    }
}