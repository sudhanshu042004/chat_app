import { NextRequest, NextResponse } from "next/server";
import { getToken, GetTokenParams } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;

  if (!secret) {
    console.error("NEXTAUTH_SECRET is not set in the environment variables");
    return NextResponse.next(); // Or return a safe default, since throwing blocks build
  }

  const token = await getToken({
    req,
    secret: secret as string,
    raw: true,
    salt: "authjs"
  } as any);

  if (!token) {
    console.log("No token found, redirecting to login");
    return NextResponse.redirect(new URL("/login", req.url));
  }

  console.log("Token found, proceeding");
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
