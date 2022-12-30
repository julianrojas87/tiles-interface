/**
 * author: Julián Rojas (julianandres.rojasmelendez@ugent.be)
 * Ghent University - imec - IDLab
 */

import { config } from '../config/config.js';
import { build } from '../lib/main.js';

const server = build(config);

const start = async () => {
    try {
        await server.listen({ port: config.fastifyConfig.port, host: '0.0.0.0' })
    } catch (err) {
        server.log.error(err)
        process.exit(1)
    }
}
start()