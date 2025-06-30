// app/api/inngest/route.js (NOTE: lowercase 'api' not 'API')
import {
  inngest,
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdate,
} from "@/config/inngest";
import { serve } from "inngest/next";

// App Router API route - export named HTTP methods
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [syncUserCreation, syncUserUpdate, syncUserDeletion],
});
