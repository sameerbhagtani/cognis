import http from "node:http";

import createServerApplication from "./app.js";
import { db } from "@cognis/database";

import env from "./shared/config/env.js";

async function main() {
    try {
        await db.execute("SELECT 1");
        console.log("✅ Database Connected");

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
