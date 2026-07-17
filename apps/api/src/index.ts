import http from "node:http";

import createServerApplication from "./app.js";
import env from "./shared/config/env.js";

async function main() {
    try {
        const server = http.createServer(createServerApplication());

        server.listen(env.PORT, () => {
            console.log(`✅ API Server started on PORT: ${env.PORT}`);
        });
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

main();
