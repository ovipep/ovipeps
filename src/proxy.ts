import { NextRequest, NextResponse } from "next/server";

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function proxy(request: NextRequest) {
  if (unsafeMethods.has(request.method)) {
    const origin = request.headers.get("origin");
    const fetchSite = request.headers.get("sec-fetch-site");
    const sameOrigin = origin === request.nextUrl.origin;
    const sameSiteRequest = fetchSite === "same-origin" || fetchSite === "same-site";

    if (!sameOrigin || (fetchSite && !sameSiteRequest)) {
      return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
    }

    const contentLength = Number(request.headers.get("content-length") ?? "0");
    const uploadLimit = request.nextUrl.pathname.startsWith("/api/admin/classroom")
      ? 15 * 1024 * 1024
      : 1024 * 1024;
    if (Number.isFinite(contentLength) && contentLength > uploadLimit) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
