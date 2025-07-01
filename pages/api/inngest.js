// pages/api/inngest.js
import {
  inngest,
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdate,
} from "@/config/inngest";
import { serve } from "inngest/next";

export default serve({
  client: inngest,
  functions: [syncUserCreation, syncUserUpdate, syncUserDeletion],
});
