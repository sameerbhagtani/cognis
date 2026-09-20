import { create, type AxiosError } from "axios";

import { authClient } from "@/lib/auth";
import { ApiClientError } from "./ApiClientError";

import type { ApiFailure } from "./types";

export const api = create({
    baseURL: process.env.EXPO_PUBLIC_SERVER_URL,
});

// authClient's own fetch (used only for /api/auth/*) attaches the Better Auth
// session automatically. Every other request needs the same session cookie
// handed to it by hand — @better-auth/expo exposes it for exactly this.
api.interceptors.request.use(async (config) => {
    const cookie = await authClient.getCookie();

    if (cookie) config.headers.set("Cookie", cookie);

    return config;
});

// Normalises every failure into one shape, matching the backend's error
// envelope, so call sites never touch a raw AxiosError.
api.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiFailure>) => {
        if (!error.response) {
            return Promise.reject(new ApiClientError(0, "Network error — check your connection"));
        }

        const { status, data, headers } = error.response;
        const retryAfter = headers["retry-after"];

        return Promise.reject(
            new ApiClientError(
                status,
                data?.message ?? "Something went wrong",
                data?.errors,
                retryAfter ? Number(retryAfter) : undefined,
            ),
        );
    },
);
