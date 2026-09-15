export function getApiErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === "object" && error !== null && "response" in error) {
        const response = (error as { response?: { data?: { error?: string } } }).response;
        return response?.data?.error || fallback;
    }

    return fallback;
}
