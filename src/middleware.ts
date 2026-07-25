import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const home = new URL("/", request.url);
    home.searchParams.set("auth", "login");
    home.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(home);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app", "/app/:path*"],
};
