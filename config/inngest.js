// config/inngest.js
import { Inngest } from "inngest";

// Create a client to send and receive events
export const inngest = new Inngest({
  id: "quickcart-next",
  name: "QuickCart App",
});

// Import database connection and models only when needed
// This prevents build-time issues
async function getDbModels() {
  const { connectDb } = await import("./db");
  const { User } = await import("@/models/User");
  return { connectDb, User };
}

// Inngest function to create user data in the database
export const syncUserCreation = inngest.createFunction(
  { id: "sync-user-creation" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    try {
      const { id, first_name, last_name, email_addresses, image_url } =
        event.data;

      // Dynamic import to prevent build-time issues
      const { connectDb, User } = await getDbModels();

      const userData = {
        _id: id,
        name: `${first_name || ""} ${last_name || ""}`.trim(),
        email: email_addresses?.[0]?.email_address || "",
        imageUrl: image_url || "",
        cartItems: {},
      };

      await connectDb();
      const newUser = await User.create(userData);
      console.log("User created:", newUser._id);

      return { success: true, userId: newUser._id };
    } catch (error) {
      console.error("Error in syncUserCreation:", error);
      return { success: false, error: error.message };
    }
  }
);

// Inngest function to update user data in the database
export const syncUserUpdate = inngest.createFunction(
  { id: "sync-user-update" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    try {
      const { id, first_name, last_name, email_addresses, image_url } =
        event.data;

      // Dynamic import to prevent build-time issues
      const { connectDb, User } = await getDbModels();

      const userData = {
        name: `${first_name || ""} ${last_name || ""}`.trim(),
        email: email_addresses?.[0]?.email_address || "",
        imageUrl: image_url || "",
      };

      await connectDb();
      const updatedUser = await User.updateOne({ _id: id }, { $set: userData });
      console.log("User updated:", id, updatedUser.modifiedCount);

      return { success: true, userId: id, modified: updatedUser.modifiedCount };
    } catch (error) {
      console.error("Error in syncUserUpdate:", error);
      return { success: false, error: error.message };
    }
  }
);

// Inngest function to delete user data from the database
export const syncUserDeletion = inngest.createFunction(
  { id: "sync-user-deletion" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    try {
      const { id } = event.data;

      // Dynamic import to prevent build-time issues
      const { connectDb, User } = await getDbModels();

      await connectDb();
      const deletedUser = await User.deleteOne({ _id: id });
      console.log("User deleted:", id, deletedUser.deletedCount);

      return { success: true, userId: id, deleted: deletedUser.deletedCount };
    } catch (error) {
      console.error("Error in syncUserDeletion:", error);
      return { success: false, error: error.message };
    }
  }
);
