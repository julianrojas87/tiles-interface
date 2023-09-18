/**
 * author: Julián Rojas (julianandres.rojasmelendez@ugent.be)
 * Ghent University - imec - IDLab
 */

export default {
    ERA_virtuoso: {
        location: (id) => {
            return `
            PREFIX era: <http://data.europa.eu/949/>
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            PREFIX gsp: <http://www.opengis.net/ont/geosparql#>
            SELECT ?id ?label ?wkt
            FROM <http://data.europa.eu/949/graph/rinf>
            WHERE {
                BIND(<${id}> AS ?id)
                ?id a era:NetElement;
                    ^era:elementPart [
                        era:hasImplementation [
                            a era:OperationalPoint;
                            rdfs:label ?label;
                            gsp:hasGeometry [ gsp:asWKT ?wkt ]
                        ]
                    ].
            }
            `
        },
        index: [
            (lat1, long1, lat2, long2) => {
                // Query to get the OP and SoL-related node count of a given tile (geospatial bounding box)
                return `
                PREFIX era: <http://data.europa.eu/949/>
                PREFIX wgs: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                SELECT (COUNT(?node) AS ?count) 
                FROM <http://data.europa.eu/949/graph/rinf>
                WHERE {
                    ?OP a era:OperationalPoint;
                            wgs:location [ 
                                wgs:lat ?lat;
                                wgs:long ?long
                            ].
                    {
                        ?OP era:hasAbstraction [ era:elementPart ?node ].
                    }
                    UNION
                    {
                        ?SoL a era:SectionOfLine;
                            era:hasAbstraction [ era:elementPart ?node ].

                        ?OP2 wgs:location [ 
                                wgs:lat ?lat2;
                                wgs:long ?long2
                            ].
                        
                        {
                            ?SoL era:opStart ?OP;
                                era:opEnd ?OP2
                        }
                        UNION
                        {
                            ?SoL era:opEnd ?OP;
                                era:opStart ?OP2
                        }

                        BIND(CONCAT("POINT(", STR((?long + ?long2) / 2), " ", STR((?lat + ?lat2) / 2), ")") AS ?wkt)
                    }
                    
                    
                    FILTER(?long >= ${long1} && ?long <= ${long2})
                    FILTER(?lat <= ${lat1} && ?lat >= ${lat2})
                }
                `;
            }
        ],
        queries: [
            (lat1, long1, lat2, long2) => {
                // Query for all OP related topology nodes and their connections within the given bbox
                return `
                PREFIX era: <http://data.europa.eu/949/>
                PREFIX era-nv: <http://data.europa.eu/949/concepts/navigabilities/rinf/>
                PREFIX wgs: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                PREFIX gsp: <http://www.opengis.net/ont/geosparql#>
                PREFIX rt: <http://w3id.org/routable-tiles/terms#>
                CONSTRUCT {
                    ?opne gsp:asWKT ?wkt;
                        rt:cost ?length;
                        rt:linkedTo ?nextNe.
                    
                    ?prevNe rt:linkedTo ?opne.
                }
                FROM <http://data.europa.eu/949/graph/rinf>
                WHERE {
                    ?OP a era:OperationalPoint;
                        era:hasAbstraction ?mesoOPNe;
                        wgs:location [ 
                            gsp:asWKT ?wkt;
                            wgs:lat ?lat;
                            wgs:long ?long
                        ].
                    
                    ?opne a era:NetElement;
                        ^era:elementPart ?mesoOPNe.
                    
                    OPTIONAL { ?opne era:length ?nelength }
                    BIND(COALESCE(?nelength, 1.0) AS ?length)

                    VALUES ?navAB { era-nv:AB era-nv:Both }
                    VALUES ?navBA { era-nv:BA era-nv:Both }

                    {
                        ?nr1 a era:NetRelation;
                            era:elementA ?opne;
                            era:elementB ?nextNe;
                            era:navigability ?navAB.   
                    }
                    UNION
                    {
                        ?nr2 a era:NetRelation;
                            era:elementA ?nextNe;
                            era:elementB ?opne;
                            era:navigability ?navBA.
                    }
                    UNION
                    {
                        ?nr3 a era:NetRelation;
                            era:elementA ?prevNe;
                            era:elementB ?opne;
                            era:navigability ?navAB.
                    }
                    UNION
                    {
                        ?nr4 a era:NetRelation;
                            era:elementA ?opne;
                            era:elementB ?prevNe;
                            era:navigability ?navBA.
                    }

                    FILTER(?long >= ${long1} && ?long <= ${long2})
                    FILTER(?lat <= ${lat1} && ?lat >= ${lat2})
                }
                `;
            },
            (lat1, long1, lat2, long2) => {
                // Query for all SoL related topology nodes within the given bbox
                return `
                PREFIX era: <http://data.europa.eu/949/>
                PREFIX era-nv: <http://data.europa.eu/949/concepts/navigabilities/rinf/>
                PREFIX gsp: <http://www.opengis.net/ont/geosparql#>
                PREFIX wgs: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                PREFIX rt: <http://w3id.org/routable-tiles/terms#>
                CONSTRUCT {
                    ?solne rt:cost ?length;
                        gsp:asWKT ?wkt.
                }
                FROM <http://data.europa.eu/949/graph/rinf>
                WHERE {
                    ?OP1 a era:OperationalPoint;
                        wgs:location [ 
                            wgs:lat ?lat1;
                            wgs:long ?long1
                        ].
                    ?OP2 wgs:location [ 
                            wgs:lat ?lat2;
                            wgs:long ?long2
                        ].
                    ?SoL a era:SectionOfLine;
                        era:hasAbstraction ?solMesoNe.
                    
                    {
                        ?SoL era:opStart ?OP1;
                            era:opEnd ?OP2
                    }
                    UNION
                    {
                        ?SoL era:opEnd ?OP1;
                            era:opStart ?OP2
                    }
                    
                    ?solne a era:NetElement;
                        era:length ?length;
                        ^era:elementPart ?solMesoNe.

                    BIND(CONCAT("POINT(", STR((?long1 + ?long2) / 2), " ", STR((?lat1 + ?lat2) / 2), ")") AS ?wkt)
                    
                    FILTER(?long1 >= ${long1} && ?long1 <= ${long2})
                    FILTER(?lat1 <= ${lat1} && ?lat1 >= ${lat2})
                }
                `;
            },
            (lat1, long1, lat2, long2) => {
                // Query for outgoing SoL related topology nodes at the borders of the bbox
                return `
                PREFIX era: <http://data.europa.eu/949/>
                PREFIX era-nv: <http://data.europa.eu/949/concepts/navigabilities/rinf/>
                PREFIX wgs: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                PREFIX gsp: <http://www.opengis.net/ont/geosparql#>
                PREFIX rt: <http://w3id.org/routable-tiles/terms#>
                CONSTRUCT {
                    ?solne rt:cost ?solLength;
                        gsp:asWKT ?solWkt;
                        rt:linkedTo ?opne.
                    
                    ?opne gsp:asWKT ?opWkt;
                        rt:cost ?opLength.
                } 
                FROM <http://data.europa.eu/949/graph/rinf>
                WHERE {        
                    ?inOP a era:OperationalPoint;
                        wgs:location [ 
                            wgs:lat ?inLat; 
                            wgs:long ?inLong 
                    ].
                    ?outOP a era:OperationalPoint;
                        era:hasAbstraction ?mesoOPNe;
                        wgs:location [
                            wgs:lat ?outLat;
                            wgs:long ?outLong;
                            gsp:asWKT ?opWkt 
                    ].
                    ?SoL a era:SectionOfLine;
                        era:hasAbstraction ?solMesoNe.
                    {
                        ?SoL era:opStart ?inOP;
                            era:opEnd ?outOP.
                    }
                    UNION
                    {
                        ?SoL era:opStart ?outOP;
                            era:opEnd ?inOP.
                    }
                    
                    ?opne ^era:elementPart ?mesoOPNe.
                    OPTIONAL { ?opne era:length ?nelength }
                    BIND(COALESCE(?nelength, 1.0) AS ?opLength)
                    
                    ?solne ^era:elementPart ?solMesoNe;
                            era:length ?solLength.
                    BIND(CONCAT("POINT(", STR((?inLong + ?outLong) / 2), " ", STR((?inLat + ?outLat) / 2), ")") AS ?solWkt)

                    VALUES ?navAB { era-nv:AB era-nv:Both }
                    VALUES ?navBA { era-nv:BA era-nv:Both }

                    {
                        ?nr1 a era:NetRelation;
                            era:elementA ?solne;
                            era:elementB ?opne;
                            era:navigability ?navAB.
                    }
                    UNION
                    {
                        ?nr2 a era:NetRelation;
                            era:elementA ?opne;
                            era:elementB ?solne;
                            era:navigability ?navBA.
                    }
                    
                    # Conditions for OP to be inside the tile in question
                    FILTER(?inLong >= ${long1} && ?inLong <= ${long2})
                    FILTER(?inLat <= ${lat1} && ?inLat >= ${lat2})
    
                    # Condition for OP to be outside the tile in question
                    FILTER(?outLong < ${long1} || ?outLong > ${long2} || ?outLat > ${lat1} || ?outLat < ${lat2})
                }            
                `;
            },
            (lat1, long1, lat2, long2) => {
                // Query for incoming SoL related topology nodes at the borders of the bbox
                return `
                PREFIX era: <http://data.europa.eu/949/>
                PREFIX era-nv: <http://data.europa.eu/949/concepts/navigabilities/rinf/>
                PREFIX wgs: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                PREFIX gsp: <http://www.opengis.net/ont/geosparql#>
                PREFIX rt: <http://w3id.org/routable-tiles/terms#>
                CONSTRUCT {
                    ?opne gsp:asWKT ?opWkt;
                        rt:cost ?opLength;
                        rt:linkedTo ?solne.
                    
                    ?solne rt:cost ?solLength;
                        gsp:asWKT ?solWkt.
                } 
                FROM <http://data.europa.eu/949/graph/rinf>
                WHERE {        
                    ?inOP a era:OperationalPoint;
                        wgs:location [ 
                            wgs:lat ?inLat; 
                            wgs:long ?inLong 
                    ].
                    ?outOP a era:OperationalPoint;
                        era:hasAbstraction ?mesoOPNe;
                        wgs:location [
                            wgs:lat ?outLat;
                            wgs:long ?outLong;
                            gsp:asWKT ?opWkt 
                    ].
                    ?SoL a era:SectionOfLine;
                        era:hasAbstraction ?solMesoNe.
                    {
                        ?SoL era:opStart ?inOP;
                            era:opEnd ?outOP.
                    }
                    UNION
                    {
                        ?SoL era:opStart ?outOP;
                            era:opEnd ?inOP.
                    }
                    
                    ?opne ^era:elementPart ?mesoOPNe.
                    OPTIONAL { ?opne era:length ?nelength }
                    BIND(COALESCE(?nelength, 1.0) AS ?opLength)
                    
                    ?solne ^era:elementPart ?solMesoNe;
                            era:length ?solLength.
                    BIND(CONCAT("POINT(", STR((?inLong + ?outLong) / 2), " ", STR((?inLat + ?outLat) / 2), ")") AS ?solWkt)

                    VALUES ?navAB { era-nv:AB era-nv:Both }
                    VALUES ?navBA { era-nv:BA era-nv:Both }

                    {
                        ?nr1 a era:NetRelation;
                            era:elementA ?opne;
                            era:elementB ?solne;
                            era:navigability ?navAB.
                    }
                    UNION
                    {
                        ?nr2 a era:NetRelation;
                            era:elementA ?solne;
                            era:elementB ?opne;
                            era:navigability ?navBA.
                    }
                    
                    # Conditions for OP to be inside the tile in question
                    FILTER(?inLong >= ${long1} && ?inLong <= ${long2})
                    FILTER(?inLat <= ${lat1} && ?inLat >= ${lat2})
    
                    # Condition for OP to be outside the tile in question
                    FILTER(?outLong < ${long1} || ?outLong > ${long2} || ?outLat > ${lat1} || ?outLat < ${lat2})
                }            
                `;
            }
        ]
    },
    ERA_graphdb: {
        location: (id) => {
            return `
            PREFIX era: <http://data.europa.eu/949/>
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            PREFIX gsp: <http://www.opengis.net/ont/geosparql#>
            SELECT ?id ?label ?wkt
            WHERE {
                BIND(<${id}> AS ?id)
                ?id a era:NetElement;
                    ^era:elementPart [
                        era:hasImplementation [
                            a era:OperationalPoint;
                            rdfs:label ?label;
                            gsp:hasGeometry [ gsp:asWKT ?wkt ]
                        ]
                    ].
            }
            `
        },
        queries: [
            (lat1, long1, lat2, long2) => {
                // Query for all OP related topology nodes and their connections within the given bbox
                // Here we directly bind the default cost because GraphDB does not deal well
                // with conditional functions like COALESCE() or IF().
                return `
                PREFIX era: <http://data.europa.eu/949/>
                PREFIX wgs: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                PREFIX gsp: <http://www.opengis.net/ont/geosparql#>
                PREFIX era-nv: <http://data.europa.eu/949/concepts/navigabilities/rinf/>
                PREFIX rt: <http://w3id.org/routable-tiles/terms#>
                CONSTRUCT {
                    ?opne gsp:asWKT ?wkt;
                        rt:cost 1.0;
                        rt:linkedTo ?nextNe.
                    
                    ?prevNe rt:linkedTo ?opne.
                } 
                WHERE {
                    ?OP a era:OperationalPoint;
                        era:hasAbstraction ?mesoOPNe;
                        wgs:location [ 
                            gsp:asWKT ?wkt;
                            wgs:lat ?lat;
                            wgs:long ?long
                        ].
                    
                    ?opne a era:NetElement;
                        ^era:elementPart ?mesoOPNe.
                    
                    VALUES ?navAB { era-nv:AB era-nv:Both }
                    VALUES ?navBA { era-nv:BA era-nv:Both }

                    {
                        ?nr1 a era:NetRelation;
                            era:elementA ?opne;
                            era:elementB ?nextNe;
                            era:navigability ?navAB.   
                    }
                    UNION
                    {
                        ?nr2 a era:NetRelation;
                            era:elementA ?nextNe;
                            era:elementB ?opne;
                            era:navigability ?navBA.
                    }
                    UNION
                    {
                        ?nr3 a era:NetRelation;
                            era:elementA ?prevNe;
                            era:elementB ?opne;
                            era:navigability ?navAB.
                    }
                    UNION
                    {
                        ?nr4 a era:NetRelation;
                            era:elementA ?opne;
                            era:elementB ?prevNe;
                            era:navigability ?navBA.
                    }

                    FILTER(?long >= ${long1} && ?long <= ${long2})
                    FILTER(?lat <= ${lat1} && ?lat >= ${lat2})
                }
                `;
            },
            (lat1, long1, lat2, long2) => {
                // Query for all SoL related topology nodes within the given bbox
                // In this case we query for the lat and long as separated properties
                // since using the CONCAT function to merge them, results in very poor performance.
                return `
                PREFIX era: <http://data.europa.eu/949/>
                PREFIX gsp: <http://www.opengis.net/ont/geosparql#>
                PREFIX wgs: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                PREFIX era-nv: <http://data.europa.eu/949/concepts/navigabilities/rinf/>
                PREFIX rt: <http://w3id.org/routable-tiles/terms#>
                CONSTRUCT {
                    ?solne rt:cost ?length;
                        wgs:lat ?solLat;
                        wgs:long ?solLong.
                } 
                WHERE {
                    ?OP1 a era:OperationalPoint;
                        wgs:location [ 
                            wgs:lat ?lat1;
                            wgs:long ?long1
                        ].
                    ?OP2 wgs:location [ 
                            wgs:lat ?lat2;
                            wgs:long ?long2
                        ].
                    ?SoL a era:SectionOfLine;
                        era:hasAbstraction ?solMesoNe.

                    {
                        ?SoL era:opStart ?OP1;
                            era:opEnd ?OP2
                    }
                    UNION
                    {
                        ?SoL era:opEnd ?OP1;
                            era:opStart ?OP2
                    }

                    ?solne a era:NetElement;
                        era:length ?length;
                        ^era:elementPart ?solMesoNe.

                    { BIND((?long1 + ?long2)/2 AS ?solLong) } UNION { BIND((?lat1 + ?lat2)/2 AS ?solLat) }

                    FILTER(?long1 >= ${long1} && ?long1 <= ${long2})
                    FILTER(?lat1 <= ${lat1} && ?lat1 >= ${lat2})
                }
                `;
            },
            (lat1, long1, lat2, long2) => {
                // Query for outgoing SoL related topology nodes at the borders of the bbox
                // Here we apply both workarounds of the previous queries. 
                return `
                PREFIX era: <http://data.europa.eu/949/>
                PREFIX era-nv: <http://data.europa.eu/949/concepts/navigabilities/rinf/>
                PREFIX wgs: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                PREFIX gsp: <http://www.opengis.net/ont/geosparql#>
                PREFIX rt: <http://w3id.org/routable-tiles/terms#>
                CONSTRUCT {
                    ?solne rt:cost ?solLength;
                        wgs:lat ?solLat;
                        wgs:long ?solLong;
                        rt:linkedTo ?opne.
                    
                    ?opne gsp:asWKT ?opWkt;
                        rt:cost 1.0.
                } 
                WHERE {        
                    ?inOP a era:OperationalPoint;
                        wgs:location [ 
                            wgs:lat ?inLat; 
                            wgs:long ?inLong 
                        ].
                    ?outOP a era:OperationalPoint;
                        era:hasAbstraction ?mesoOPNe;
                            wgs:location [
                            wgs:lat ?outLat;
                            wgs:long ?outLong;
                            gsp:asWKT ?opWkt 
                        ].
                    ?SoL a era:SectionOfLine;
                        era:hasAbstraction ?solMesoNe.

                    {
                        ?SoL era:opStart ?inOP;
                            era:opEnd ?outOP.
                    }
                    UNION
                    {
                        ?SoL era:opStart ?outOP;
                            era:opEnd ?inOP.
                    }

                    ?opne ^era:elementPart ?mesoOPNe.

                    ?solne ^era:elementPart ?solMesoNe;
                            era:length ?solLength.
                    
                    { BIND((?inLong + ?outLong)/2 AS ?solLong) } UNION { BIND((?inLat + ?outLat)/2 AS ?solLat) }
                    
                    VALUES ?navAB { era-nv:AB era-nv:Both }
                    VALUES ?navBA { era-nv:BA era-nv:Both }

                    {
                        ?nr1 a era:NetRelation;
                            era:elementA ?solne;
                            era:elementB ?opne;
                            era:navigability ?navAB.
                    }
                    UNION
                    {
                        ?nr2 a era:NetRelation;
                            era:elementA ?opne;
                            era:elementB ?solne;
                            era:navigability ?navBA.
                    }
                    
                    # Conditions for OP to be inside the tile in question
                    FILTER(?inLong >= ${long1} && ?inLong <= ${long2})
                    FILTER(?inLat <= ${lat1} && ?inLat >= ${lat2})
    
                    # Condition for OP to be outside the tile in question
                    FILTER(?outLong < ${long1} || ?outLong > ${long2} || ?outLat > ${lat1} || ?outLat < ${lat2})
                }            
                `;
            },
            (lat1, long1, lat2, long2) => {
                // Query for incoming SoL related topology nodes at the borders of the bbox
                // Here we apply both workarounds of the previous queries. 
                return `
                PREFIX era: <http://data.europa.eu/949/>
                PREFIX era-nv: <http://data.europa.eu/949/concepts/navigabilities/rinf/>
                PREFIX wgs: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                PREFIX gsp: <http://www.opengis.net/ont/geosparql#>
                PREFIX rt: <http://w3id.org/routable-tiles/terms#>
                CONSTRUCT {
                    ?opne gsp:asWKT ?opWkt;
                        rt:cost 1.0;
                        rt:linkedTo ?solne.
                    
                    ?solne rt:cost ?solLength;
                        wgs:lat ?solLat;
                        wgs:long ?solLong.
                } 
                WHERE {        
                    ?inOP a era:OperationalPoint;
                        wgs:location [ 
                            wgs:lat ?inLat; 
                            wgs:long ?inLong 
                        ].
                    ?outOP a era:OperationalPoint;
                        era:hasAbstraction ?mesoOPNe;
                            wgs:location [
                            wgs:lat ?outLat;
                            wgs:long ?outLong;
                            gsp:asWKT ?opWkt 
                        ].
                    ?SoL a era:SectionOfLine;
                        era:hasAbstraction ?solMesoNe.

                    {
                        ?SoL era:opStart ?inOP;
                            era:opEnd ?outOP.
                    }
                    UNION
                    {
                        ?SoL era:opStart ?outOP;
                            era:opEnd ?inOP.
                    }

                    ?opne ^era:elementPart ?mesoOPNe.

                    ?solne ^era:elementPart ?solMesoNe;
                            era:length ?solLength.
                    
                    { BIND((?inLong + ?outLong)/2 AS ?solLong) } UNION { BIND((?inLat + ?outLat)/2 AS ?solLat) }
                    
                    VALUES ?navAB { era-nv:AB era-nv:Both }
                    VALUES ?navBA { era-nv:BA era-nv:Both }

                    {
                        ?nr1 a era:NetRelation;
                            era:elementA ?opne;
                            era:elementB ?solne;
                            era:navigability ?navAB.
                    }
                    UNION
                    {
                        ?nr2 a era:NetRelation;
                            era:elementA ?solne;
                            era:elementB ?opne;
                            era:navigability ?navBA.
                    }
                    
                    # Conditions for OP to be inside the tile in question
                    FILTER(?inLong >= ${long1} && ?inLong <= ${long2})
                    FILTER(?inLat <= ${lat1} && ?inLat >= ${lat2})
    
                    # Condition for OP to be outside the tile in question
                    FILTER(?outLong < ${long1} || ?outLong > ${long2} || ?outLat > ${lat1} || ?outLat < ${lat2})
                }            
                `;
            }
        ]
    },
    ERA_stardog: {
        location: (id) => {
            return `
            PREFIX era: <http://data.europa.eu/949/>
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            PREFIX gsp: <http://www.opengis.net/ont/geosparql#>
            SELECT ?id ?label ?wkt
            FROM <http://data.europa.eu/949/graph/rinf>
            WHERE {
                BIND(<${id}> AS ?id)
                ?id a era:NetElement;
                    ^era:elementPart [
                        era:hasImplementation [
                            a era:OperationalPoint;
                            rdfs:label ?label;
                            gsp:hasGeometry [ gsp:asWKT ?wkt ]
                        ]
                    ].
            }
            `
        },
        queries: [
            (lat1, long1, lat2, long2) => {
                // Query for all OP related topology nodes and their connections within the given bbox
                return `
                PREFIX era: <http://data.europa.eu/949/>
                PREFIX era-nv: <http://data.europa.eu/949/concepts/navigabilities/rinf/>
                PREFIX wgs: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                PREFIX gsp: <http://www.opengis.net/ont/geosparql#>
                PREFIX rt: <http://w3id.org/routable-tiles/terms#>
                CONSTRUCT {
                    ?opne gsp:asWKT ?wkt;
                        rt:cost ?length;
                        rt:linkedTo ?nextNe.
                    
                    ?prevNe rt:linkedTo ?opne.
                }
                FROM <http://data.europa.eu/949/graph/rinf>
                WHERE {
                    ?OP a era:OperationalPoint;
                        era:hasAbstraction ?mesoOPNe;
                        wgs:location [ 
                            gsp:asWKT ?wkt;
                            wgs:lat ?lat;
                            wgs:long ?long
                        ].
                    
                    ?opne a era:NetElement;
                        ^era:elementPart ?mesoOPNe.
                    
                    OPTIONAL { ?opne era:length ?nelength }
                    BIND(COALESCE(?nelength, 1.0) AS ?length)

                    VALUES ?navAB { era-nv:AB era-nv:Both }
                    VALUES ?navBA { era-nv:BA era-nv:Both }

                    {
                        ?nr1 a era:NetRelation;
                            era:elementA ?opne;
                            era:elementB ?nextNe;
                            era:navigability ?navAB.   
                    }
                    UNION
                    {
                        ?nr2 a era:NetRelation;
                            era:elementA ?nextNe;
                            era:elementB ?opne;
                            era:navigability ?navBA.
                    }
                    UNION
                    {
                        ?nr3 a era:NetRelation;
                            era:elementA ?prevNe;
                            era:elementB ?opne;
                            era:navigability ?navAB.
                    }
                    UNION
                    {
                        ?nr4 a era:NetRelation;
                            era:elementA ?opne;
                            era:elementB ?prevNe;
                            era:navigability ?navBA.
                    }

                    FILTER(?long >= ${long1} && ?long <= ${long2})
                    FILTER(?lat <= ${lat1} && ?lat >= ${lat2})
                }
                `;
            },
            (lat1, long1, lat2, long2) => {
                // Query for all SoL related topology nodes within the given bbox
                return `
                PREFIX era: <http://data.europa.eu/949/>
                PREFIX era-nv: <http://data.europa.eu/949/concepts/navigabilities/rinf/>
                PREFIX gsp: <http://www.opengis.net/ont/geosparql#>
                PREFIX wgs: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                PREFIX rt: <http://w3id.org/routable-tiles/terms#>
                CONSTRUCT {
                    ?solne rt:cost ?length;
                        gsp:asWKT ?wkt.
                }
                FROM <http://data.europa.eu/949/graph/rinf>
                WHERE {
                    ?OP1 a era:OperationalPoint;
                        wgs:location [ 
                            wgs:lat ?lat1;
                            wgs:long ?long1
                        ].
                    ?OP2 wgs:location [ 
                            wgs:lat ?lat2;
                            wgs:long ?long2
                        ].
                    ?SoL a era:SectionOfLine;
                        era:hasAbstraction ?solMesoNe.
                    
                    {
                        ?SoL era:opStart ?OP1;
                            era:opEnd ?OP2
                    }
                    UNION
                    {
                        ?SoL era:opEnd ?OP1;
                            era:opStart ?OP2
                    }
                    
                    ?solne a era:NetElement;
                        era:length ?length;
                        ^era:elementPart ?solMesoNe.

                    BIND(CONCAT("POINT(", STR((?long1 + ?long2) / 2), " ", STR((?lat1 + ?lat2) / 2), ")") AS ?wkt)
                    
                    FILTER(?long1 >= ${long1} && ?long1 <= ${long2})
                    FILTER(?lat1 <= ${lat1} && ?lat1 >= ${lat2})
                }
                `;
            },
            (lat1, long1, lat2, long2) => {
                // Query for outgoing SoL related topology nodes at the borders of the bbox
                return `
                PREFIX era: <http://data.europa.eu/949/>
                PREFIX era-nv: <http://data.europa.eu/949/concepts/navigabilities/rinf/>
                PREFIX wgs: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                PREFIX gsp: <http://www.opengis.net/ont/geosparql#>
                PREFIX rt: <http://w3id.org/routable-tiles/terms#>
                CONSTRUCT {
                    ?solne rt:cost ?solLength;
                        gsp:asWKT ?solWkt;
                        rt:linkedTo ?opne.
                    
                    ?opne gsp:asWKT ?opWkt;
                        rt:cost ?opLength.
                } 
                FROM <http://data.europa.eu/949/graph/rinf>
                WHERE {        
                    ?inOP a era:OperationalPoint;
                        wgs:location [ 
                            wgs:lat ?inLat; 
                            wgs:long ?inLong 
                    ].
                    ?outOP a era:OperationalPoint;
                        era:hasAbstraction ?mesoOPNe;
                        wgs:location [
                            wgs:lat ?outLat;
                            wgs:long ?outLong;
                            gsp:asWKT ?opWkt 
                    ].
                    ?SoL a era:SectionOfLine;
                        era:hasAbstraction ?solMesoNe.
                    {
                        ?SoL era:opStart ?inOP;
                            era:opEnd ?outOP.
                    }
                    UNION
                    {
                        ?SoL era:opStart ?outOP;
                            era:opEnd ?inOP.
                    }
                    
                    ?opne ^era:elementPart ?mesoOPNe.
                    OPTIONAL { ?opne era:length ?nelength }
                    BIND(COALESCE(?nelength, 1.0) AS ?opLength)
                    
                    ?solne ^era:elementPart ?solMesoNe;
                            era:length ?solLength.
                    BIND(CONCAT("POINT(", STR((?inLong + ?outLong) / 2), " ", STR((?inLat + ?outLat) / 2), ")") AS ?solWkt)

                    VALUES ?navAB { era-nv:AB era-nv:Both }
                    VALUES ?navBA { era-nv:BA era-nv:Both }

                    {
                        ?nr1 a era:NetRelation;
                            era:elementA ?solne;
                            era:elementB ?opne;
                            era:navigability ?navAB.
                    }
                    UNION
                    {
                        ?nr2 a era:NetRelation;
                            era:elementA ?opne;
                            era:elementB ?solne;
                            era:navigability ?navBA.
                    }
                    
                    # Conditions for OP to be inside the tile in question
                    FILTER(?inLong >= ${long1} && ?inLong <= ${long2})
                    FILTER(?inLat <= ${lat1} && ?inLat >= ${lat2})
    
                    # Condition for OP to be outside the tile in question
                    FILTER(?outLong < ${long1} || ?outLong > ${long2} || ?outLat > ${lat1} || ?outLat < ${lat2})
                }            
                `;
            },
            (lat1, long1, lat2, long2) => {
                // Query for incoming SoL related topology nodes at the borders of the bbox
                return `
                PREFIX era: <http://data.europa.eu/949/>
                PREFIX era-nv: <http://data.europa.eu/949/concepts/navigabilities/rinf/>
                PREFIX wgs: <http://www.w3.org/2003/01/geo/wgs84_pos#>
                PREFIX gsp: <http://www.opengis.net/ont/geosparql#>
                PREFIX rt: <http://w3id.org/routable-tiles/terms#>
                CONSTRUCT {
                    ?opne gsp:asWKT ?opWkt;
                        rt:cost ?opLength;
                        rt:linkedTo ?solne.
                    
                    ?solne rt:cost ?solLength;
                        gsp:asWKT ?solWkt.
                } 
                FROM <http://data.europa.eu/949/graph/rinf>
                WHERE {        
                    ?inOP a era:OperationalPoint;
                        wgs:location [ 
                            wgs:lat ?inLat; 
                            wgs:long ?inLong 
                    ].
                    ?outOP a era:OperationalPoint;
                        era:hasAbstraction ?mesoOPNe;
                        wgs:location [
                            wgs:lat ?outLat;
                            wgs:long ?outLong;
                            gsp:asWKT ?opWkt 
                    ].
                    ?SoL a era:SectionOfLine;
                        era:hasAbstraction ?solMesoNe.
                    {
                        ?SoL era:opStart ?inOP;
                            era:opEnd ?outOP.
                    }
                    UNION
                    {
                        ?SoL era:opStart ?outOP;
                            era:opEnd ?inOP.
                    }
                    
                    ?opne ^era:elementPart ?mesoOPNe.
                    OPTIONAL { ?opne era:length ?nelength }
                    BIND(COALESCE(?nelength, 1.0) AS ?opLength)
                    
                    ?solne ^era:elementPart ?solMesoNe;
                            era:length ?solLength.
                    BIND(CONCAT("POINT(", STR((?inLong + ?outLong) / 2), " ", STR((?inLat + ?outLat) / 2), ")") AS ?solWkt)

                    VALUES ?navAB { era-nv:AB era-nv:Both }
                    VALUES ?navBA { era-nv:BA era-nv:Both }

                    {
                        ?nr1 a era:NetRelation;
                            era:elementA ?opne;
                            era:elementB ?solne;
                            era:navigability ?navAB.
                    }
                    UNION
                    {
                        ?nr2 a era:NetRelation;
                            era:elementA ?solne;
                            era:elementB ?opne;
                            era:navigability ?navBA.
                    }
                    
                    # Conditions for OP to be inside the tile in question
                    FILTER(?inLong >= ${long1} && ?inLong <= ${long2})
                    FILTER(?inLat <= ${lat1} && ?inLat >= ${lat2})
    
                    # Condition for OP to be outside the tile in question
                    FILTER(?outLong < ${long1} || ?outLong > ${long2} || ?outLat > ${lat1} || ?outLat < ${lat2})
                }            
                `;
            }
        ]
    }
}