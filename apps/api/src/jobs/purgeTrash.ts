import { purgeExpiredTrash } from "../shared/services/trash.js";
import env from "../shared/config/env.js";

/**
 * Run from cron, not from the API process: an in-process timer would fire once
 * per instance, so scaling past one would run concurrent purges over the same
 * rows. A separate entrypoint keeps exactly one runner regardless of how many
 * API processes exist.
 *
 *   0 3 * * *  cd /path/to/apps/api && node dist/jobs/purgeTrash.js
 */
async function main() {
    const started = Date.now();

    const result = await purgeExpiredTrash(env.TRASH_RETENTION_DAYS);

    console.log(
        `purged trash older than ${env.TRASH_RETENTION_DAYS}d (before ${result.cutoff.toISOString()}): ` +
            `${result.folders} folders, ${result.notes} notes across ${result.workspaces} workspaces ` +
            `in ${Date.now() - started}ms` +
            (result.skipped > 0 ? ` (${result.skipped} folder(s) skipped as unsafe)` : ""),
    );

    process.exit(0);
}

// A non-zero exit is what tells cron the run failed, so the error has to be
// caught here rather than left as an unhandled rejection.
main().catch((err) => {
    console.error("trash purge failed", err);
    process.exit(1);
});
