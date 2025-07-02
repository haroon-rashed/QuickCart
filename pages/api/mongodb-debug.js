// pages/api/mongodb-debug.js
import mongoose from "mongoose";

export default async function handler(req, res) {
  // Allow both GET and POST for flexibility
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", ["GET", "POST"]);
    return res
      .status(405)
      .json({ message: `Method ${req.method} not allowed` });
  }

  const connStr = process.env.MONGODB_URI || "";
  const sanitizedConnStr = connStr
    ? `${connStr.split("://")[0]}://*****@${
        connStr.split("@").pop() || "hidden"
      }`
    : "not-configured";

  try {
    console.log("ℹ️ Attempting MongoDB connection...");
    await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
    });

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    console.log("✅ Connection successful");
    return res.status(200).json({
      status: "connected",
      database: db.databaseName,
      collections: collections.map((c) => c.name),
      connection: sanitizedConnStr,
    });
  } catch (error) {
    console.error("❌ Connection failed:", error);
    return res.status(500).json({
      status: "failed",
      error: error.message,
      connection: sanitizedConnStr,
    });
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}
