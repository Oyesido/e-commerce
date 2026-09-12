import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  (request) => {
    if (request.nextUrl.pathname.startsWith("/admin") && request.nextauth.token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  },
  {
    callbacks: { authorized: ({ token }) => Boolean(token) },
    pages: { signIn: "/login" }
  }
);

export const config = { matcher: ["/checkout/:path*", "/account/:path*", "/admin/:path*"] };
