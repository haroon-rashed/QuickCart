// app/api/inngest/route.js
import {
  inngest,
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdate,
} from "@/config/inngest";

import { serve } from "inngest/next";

// Serve the Inngest functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [syncUserCreation, syncUserUpdate, syncUserDeletion],
  signingKey: process.env.INNGEST_SIGNING_KEY, // Add this line
});
