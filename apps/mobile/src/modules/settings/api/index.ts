import { api } from "@/lib/api";

import type { ApiSuccess } from "@/lib/api";
import type { AiUsage } from "../types";

/** What the signed-in user has spent against their own allowance. */
export async function fetchAiUsage(): Promise<AiUsage> {
    const { data } = await api.get<ApiSuccess<AiUsage>>("/me/ai-usage");

    return data.data;
}
