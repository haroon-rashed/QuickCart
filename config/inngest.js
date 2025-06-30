import { Inngest } from "inngest";
import { connectDb } from "./db";
import { User } from "@/models/User";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "quickcart-next" });

// Inngest function to create user data in the database
export const syncUserCreation = inngest.createFunction(
  { id: "sync-user-creation" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;

    const userData = {
      _id: id,
      name: `${first_name} ${last_name}`,
      email: email_addresses[0].email_address,
      imageUrl: image_url,
      cartItems: {},
    };
    await connectDb();
    await User.create(userData);
  }
);

// Inngest function to update user data in the database

export const syncUserUpdate = inngest.createFunction(
  { id: "sync-user-update" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;

    const userData = {
      _id: id,
      name: `${first_name} ${last_name}`,
      email: email_addresses[0].email_address,
      imageUrl: image_url,
    };

    await connectDb();
    await User.updateOne({ _id: id }, { $set: userData });
  }
);

// Inngest function to delete user data from the database
export const syncUserDeletion = inngest.createFunction(
  {
    id: "sync-user-deletion",
  },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { id } = event.data;

    await connectDb();
    await User.deleteOne({ _id: id });
  } 
);
