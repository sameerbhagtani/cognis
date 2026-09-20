import env from "./env.js";

/**
 * Off outside production. A hard cap on sign-ins or autosaves makes local work
 * miserable, and Better Auth's own limiter defaults the same way.
 */
export const rateLimitEnabled = env.NODE_ENV === "production";

/**
 * Every limit in one place, to be tuned from here rather than hunted for.
 *
 * `points` is requests allowed per `duration` seconds. Better Auth rate limits
 * /api/auth/* itself, so nothing here covers sign-in, sign-up, password reset or
 * verification resends.
 */
export const RATE_LIMITS = {
    /** Flood guard ahead of auth, so an unauthenticated burst can't hammer the
     *  session lookup. Deliberately loose: an office or carrier NAT puts many
     *  real users behind one address. */
    ip: { points: 600, duration: 60 },

    /** The general per-user ceiling, once the session is known. */
    user: { points: 300, duration: 60 },

    /** Autosave writes on every pause in typing, so this needs real headroom. */
    noteUpdate: { points: 120, duration: 60 },

    /** Moves, soft deletes and restores serialize on the workspace advisory lock,
     *  so flooding them against one workspace stalls it for everyone in it. Keyed
     *  by user and workspace together. */
    workspaceWrite: { points: 60, duration: 60 },

    /** Adding a member sends mail. Keyed by the recipient, so the cap follows the
     *  inbox being written to rather than the account doing the writing. */
    memberInvite: { points: 10, duration: 3600 },

    /** The first endpoint that costs money per request. The spend limits are the
     *  real control; this just stops a burst arriving faster than a person could
     *  plausibly type. */
    chatMessage: { points: 20, duration: 60 },

    /** Concurrent sockets per user: a phone, a laptop and a few tabs. */
    wsConnections: 5,

    /** Each join costs a membership lookup. Keyed per socket. */
    wsJoin: { points: 20, duration: 60 },
} as const;
