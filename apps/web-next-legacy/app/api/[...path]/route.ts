import type { NextRequest } from "next/server";
import { forwardToGateway } from "@/lib/proxy";

/**
 * Runtime-configurable reverse proxy to the gateway (GATEWAY_URL is read per
 * request, so a container can be re-pointed without rebuilding). Cookies,
 * CSRF header and Set-Cookie are passed through untouched.
 */
export const dynamic = "force-dynamic";

const handler = (req: NextRequest) => forwardToGateway(req);

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
  handler as OPTIONS,
  handler as HEAD,
};
