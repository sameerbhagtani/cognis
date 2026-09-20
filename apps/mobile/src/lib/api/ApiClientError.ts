/**
 * Thrown by the shared `api` instance in place of a raw AxiosError, so call
 * sites deal with one shape instead of poking at `error.response.data`
 * themselves. Mirrors the backend's error envelope from `ApiResponse`/
 * `errorHandler` — see apps/api/src/shared/middlewares/errorHandler.ts.
 */
export class ApiClientError extends Error {
    readonly status: number;
    /** Present on a 400 from Zod validation — a treeified error, shape not enforced here. */
    readonly errors?: unknown;
    /** Present on a 429, seconds until the caller's oldest charge/request ages out. */
    readonly retryAfterSeconds?: number;

    constructor(status: number, message: string, errors?: unknown, retryAfterSeconds?: number) {
        super(message);
        this.name = "ApiClientError";
        this.status = status;
        this.errors = errors;
        this.retryAfterSeconds = retryAfterSeconds;
    }
}
