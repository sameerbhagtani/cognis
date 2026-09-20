/** Matches ApiResponse.success/created on the backend. */
export type ApiSuccess<T> = {
    success: true;
    message: string;
    data: T;
};

/** Matches the error envelope written by errorHandler. */
export type ApiFailure = {
    success: false;
    message: string;
    errors?: unknown;
};

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;
