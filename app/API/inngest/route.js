// app/api/inngest/route.js
import {
  inngest,
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdate,
  testFunction,
} from "@/config/inngest";
   
import { serve } from "inngest/next";

// Start with just the test function
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [syncUserCreation, syncUserUpdate, syncUserDeletion],
});
