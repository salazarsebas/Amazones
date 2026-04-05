export const API_BASE_URL =
  process.env.NEXT_PUBLIC_AMAZONES_API_BASE_URL ??
  process.env.AMAZONES_API_BASE_URL ??
  "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function parseApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const message =
      payload?.error?.message ?? `Request failed with status ${response.status}`;
    const code = payload?.error?.code ?? "request_failed";
    throw new ApiError(message, code, response.status);
  }

  return payload as T;
}
