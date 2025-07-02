import {
  inngest,
  syncUserCreation,
  syncUserUpdate,
  syncUserDeletion,
  debugDB,
} from "@/config/inngest";
import { serve } from "inngest/next";

// Create separate handlers
const mainHandler = serve(inngest, [
  syncUserCreation,
  syncUserUpdate,
  syncUserDeletion,
]);

const debugHandler = serve(inngest, [debugDB], {
  signingKey: process.env.INNGEST_SIGNING_KEY || "dev-key",
  servePath: "/api/inngest/debug",
});

export default async function handler(req, res) {
  // Route debug requests separately
  if (req.url?.includes("/debug")) {
    return debugHandler(req, res);
  }
  return mainHandler(req, res);
}
