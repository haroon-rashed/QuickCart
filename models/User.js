import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    cartItems: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    clerkData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    _id: false, // Using Clerk's ID as _id
  }
);

// Prevent model recompilation in development
export const User = mongoose.models.User || mongoose.model("User", UserSchema);
