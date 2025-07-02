import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "quickcart-next",
  name: "QuickCart App",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

async function getDbModels() {
  const { connectDb } = await import("./db");
  const { User } = await import("@/models/User");

  try {
    await connectDb();
    return { User };
  } catch (error) {
    console.error("❌ DB Connection Failed:", error);
    throw error;
  }
}

export const syncUserCreation = inngest.createFunction(
  { id: "sync-user-creation", retries: 3 },
  { event: "clerk/user.created" },
  async ({ event }) => {
    console.log("👤 Processing user creation:", event.data.id);

    try {
      const { User } = await getDbModels();

      const userData = {
        _id: event.data.id,
        name: `${event.data.first_name || ""} ${
          event.data.last_name || ""
        }`.trim(),
        email: event.data.email_addresses?.[0]?.email_address || null,
        imageUrl: event.data.image_url || null,
        cartItems: {},
        clerkData: event.data, // Store complete Clerk data
      };

      console.log("💾 Attempting to save:", {
        id: userData._id,
        email: userData.email,
      });

      const result = await User.findOneAndUpdate(
        { _id: event.data.id },
        userData,
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      console.log("✅ User saved:", result._id);
      return { success: true, userId: result._id };
    } catch (error) {
      console.error("❌ Save failed:", error);

      if (error.code === 11000) {
        console.log("⚠️ User already exists, updating instead");
        try {
          const { User } = await getDbModels();
          const updated = await User.updateOne(
            { _id: event.data.id },
            {
              $set: {
                name: `${event.data.first_name || ""} ${
                  event.data.last_name || ""
                }`.trim(),
                imageUrl: event.data.image_url || null,
              },
            }
          );
          return { success: true, updated: true };
        } catch (updateError) {
          console.error("❌ Update failed:", updateError);
          throw updateError;
        }
      }

      throw error;
    }
  }
);

export const syncUserUpdate = inngest.createFunction(
  { id: "sync-user-update", retries: 3 },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    console.log("🔄 Processing user update:", event.data.id);

    try {
      const { User } = await getDbModels();

      const updateData = {
        name: `${event.data.first_name || ""} ${
          event.data.last_name || ""
        }`.trim(),
        email: event.data.email_addresses?.[0]?.email_address || null,
        imageUrl: event.data.image_url || null,
        "clerkData.updated": true,
      };

      const result = await User.findOneAndUpdate(
        { _id: event.data.id },
        updateData,
        { new: true }
      );

      if (!result) {
        console.log("⚠️ User not found, creating new record");
        return await syncUserCreation({ event });
      }

      console.log("✅ User updated:", result._id);
      return { success: true, updated: true };
    } catch (error) {
      console.error("❌ Update failed:", error);
      throw error;
    }
  }
);

export const syncUserDeletion = inngest.createFunction(
  { id: "sync-user-deletion" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    console.log("🗑️ Processing user deletion:", event.data.id);

    try {
      const { User } = await getDbModels();
      const result = await User.deleteOne({ _id: event.data.id });

      if (result.deletedCount === 0) {
        console.log("⚠️ User not found for deletion");
        return { success: false, error: "User not found" };
      }

      console.log("✅ User deleted:", event.data.id);
      return { success: true, deleted: true };
    } catch (error) {
      console.error("❌ Deletion failed:", error);
      return { success: false, error: error.message };
    }
  }
);

// Debug endpoint
export const debugDB = inngest.createFunction(
  { id: "debug-db" },
  { event: "debug/db.check" },
  async () => {
    try {
      const { User } = await getDbModels();
      const count = await User.countDocuments();
      return {
        status: "active",
        userCount: count,
        dbStatus: mongoose.connection.readyState,
        dbHost:
          process.env.MONGODB_URI?.split("@")[1]?.split("/")[0] || "hidden",
      };
    } catch (error) {
      return {
        status: "error",
        error: error.message,
        dbStatus: mongoose.connection?.readyState || "disconnected",
      };
    }
  }
);
