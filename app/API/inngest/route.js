// app/api/inngest/route.js
import { inngest, testFunction } from "@/config/inngest";
// Commented out for now to isolate the issue
// import { syncUserCreation, syncUserDeletion, syncUserUpdate } from "@/config/inngest";
import { serve } from "inngest/next";

// Start with just the test function
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [testFunction],
  // Once this works, add back the other functions:
  // functions: [testFunction, syncUserCreation, syncUserUpdate, syncUserDeletion],
});
