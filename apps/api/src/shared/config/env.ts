import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),

    // How many reverse proxies sit in front of the API. 0 locally; 1 behind
    // Caddy, so req.ip is the client rather than the proxy and per-IP rate
    // limits don't lump every user into one bucket.
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),

    CLIENT_URL: z.url(),
    DATABASE_URL: z.url(),

    BREVO_API_KEY: z.string().min(1),
    EMAIL_FROM_ADDRESS: z.email(),
    EMAIL_FROM_NAME: z.string().default("Cognis"),

    TRASH_RETENTION_DAYS: z.coerce.number().int().positive().default(30),

    OPENAI_API_KEY: z.string().min(1),
});

function createEnv(env: NodeJS.ProcessEnv) {
    const safeParseResult = envSchema.safeParse(env);

    if (!safeParseResult.success) throw new Error(safeParseResult.error.message);

    return safeParseResult.data;
}

const env = createEnv(process.env);

export default env;
