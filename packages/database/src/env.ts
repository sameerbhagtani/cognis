import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
    DATABASE_URL: z.url(),
});

function createEnv(env: NodeJS.ProcessEnv) {
    const safeParseResult = envSchema.safeParse(env);

    if (!safeParseResult.success) throw new Error(safeParseResult.error.message);

    return safeParseResult.data;
}

const env = createEnv(process.env);

export default env;
