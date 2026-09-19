import http from "node:http";

import { db } from "@cognis/database";
import createServerApplication from "./app.js";
import { createSocketServer } from "./realtime/server.js";

import env from "./shared/config/env.js";

async function main() {
    try {
        await db.execute("SELECT 1");
        console.log("✅ Database connected");

        const server = http.createServer(createServerApplication());
        createSocketServer(server);

        server.listen(env.PORT, () => {
            console.log(`✅ Server started on PORT: ${env.PORT}`);
        });
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

main();
