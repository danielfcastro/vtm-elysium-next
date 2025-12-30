// __tests__/helpers/testRequest.ts
import { NextRequest } from "next/server";

export function makeNextJsonRequest(
    url: string,
    method: "GET" | "POST",
    body?: any,
    headers: Record<string, string> = {},
): NextRequest {
    const init: RequestInit = {
        method,
        headers: {
            "Content-Type": "application/json",
            ...headers,
        },
    };

    if (body !== undefined) {
        init.body = JSON.stringify(body);
    }

    const req = new Request(url, init);
    return new NextRequest(req);
}
