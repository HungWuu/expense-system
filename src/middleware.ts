export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/expenses/:path*",
    "/api/upload/:path*",
  ],
};
