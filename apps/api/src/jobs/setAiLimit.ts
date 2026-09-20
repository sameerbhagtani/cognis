import { parseArgs } from "node:util";

import { db, eq, schemas } from "@cognis/database";

import { SPEND_LIMITS } from "../shared/config/ai.js";

/**
 * Raises or clears one user's AI spend caps, so unlocking yourself or a friend
 * does not mean hand-writing SQL against the limits table at an awkward hour.
 *
 * A one-shot entrypoint like the trash purge, not a server route: this is an
 * operator action, and giving it an endpoint would mean building an admin role
 * to guard it.
 *
 *   pnpm ai:limit you@example.com --chat 150000 --indexing 30000
 *   pnpm ai:limit you@example.com --show
 *   pnpm ai:limit you@example.com --clear
 *
 * Amounts are micro-dollars per rolling day — 1_000_000 is one dollar. Each
 * budget is independent, so setting only one leaves the other on its default.
 */
const USAGE = `Usage:
  pnpm ai:limit <email> [--chat <micro-dollars>] [--indexing <micro-dollars>]
                        [--reason "<why>"] [--show] [--clear]

Amounts are micro-dollars per rolling day (1000000 = $1.00).
Defaults when no override exists: chat ${SPEND_LIMITS.chatDailyMicros}, indexing ${SPEND_LIMITS.indexingDailyMicros}.`;

function fail(message: string): never {
    console.error(`${message}\n\n${USAGE}`);
    process.exit(1);
}

function parseAmount(value: string | undefined, label: string): number | undefined {
    if (value === undefined) return undefined;

    const amount = Number(value);

    if (!Number.isInteger(amount) || amount < 0) {
        fail(`--${label} must be a whole number of micro-dollars, got "${value}"`);
    }

    return amount;
}

function describe(micros: number | null, fallback: number): string {
    const effective = micros ?? fallback;
    const source = micros === null ? "default" : "override";

    return `${effective} µ$ ($${(effective / 1_000_000).toFixed(4)}/day, ${source})`;
}

async function main() {
    const { values, positionals } = parseArgs({
        allowPositionals: true,
        options: {
            chat: { type: "string" },
            indexing: { type: "string" },
            reason: { type: "string" },
            show: { type: "boolean", default: false },
            clear: { type: "boolean", default: false },
        },
    });

    const email = positionals[0]?.trim().toLowerCase();
    if (!email) fail("An email address is required.");

    // Matches how Better Auth stores addresses, so a capitalised argument still
    // finds the account it belongs to.
    const [user] = await db
        .select({ id: schemas.user.id, email: schemas.user.email, name: schemas.user.name })
        .from(schemas.user)
        .where(eq(schemas.user.email, email))
        .limit(1);

    if (!user) fail(`No user with the email "${email}".`);

    if (values.clear) {
        await db.delete(schemas.userAiLimit).where(eq(schemas.userAiLimit.userId, user.id));
        console.log(
            `Cleared the overrides for ${user.email}; both budgets are back to the defaults.`,
        );

        return;
    }

    const chat = parseAmount(values.chat, "chat");
    const indexing = parseAmount(values.indexing, "indexing");

    if (!values.show && chat === undefined && indexing === undefined) {
        fail("Nothing to do. Pass --chat, --indexing, --clear or --show.");
    }

    if (!values.show) {
        await db
            .insert(schemas.userAiLimit)
            .values({
                userId: user.id,
                chatDailyMicros: chat ?? null,
                indexingDailyMicros: indexing ?? null,
                reason: values.reason ?? null,
            })
            .onConflictDoUpdate({
                target: schemas.userAiLimit.userId,
                set: {
                    // Only what was named on the command line changes; the other
                    // budget keeps whatever it had.
                    ...(chat !== undefined && { chatDailyMicros: chat }),
                    ...(indexing !== undefined && { indexingDailyMicros: indexing }),
                    ...(values.reason !== undefined && { reason: values.reason }),
                },
            });
    }

    const [row] = await db
        .select()
        .from(schemas.userAiLimit)
        .where(eq(schemas.userAiLimit.userId, user.id))
        .limit(1);

    console.log(`${user.name} <${user.email}>`);
    console.log(
        `  chat     ${describe(row?.chatDailyMicros ?? null, SPEND_LIMITS.chatDailyMicros)}`,
    );
    console.log(
        `  indexing ${describe(row?.indexingDailyMicros ?? null, SPEND_LIMITS.indexingDailyMicros)}`,
    );
    if (row?.reason) console.log(`  reason   ${row.reason}`);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("setting the limit failed", err);
        process.exit(1);
    });
