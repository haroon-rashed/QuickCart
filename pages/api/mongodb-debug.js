// Create this file at: pages/api/mongodb-debug.js

import mongoose from "mongoose";

export default async function handler(req, res) {
  // Skip authentication for debugging
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Sanitize connection string for logging
  const connStr = process.env.MONGODB_URI || "";
  const sanitizedConnStr = connStr
    ? `${connStr.split("://")[0]}://${connStr.includes("@") ? "*****@" : ""}${
        connStr.split("@").pop() || "hidden"
      }`
    : "not-configured";

  try {
    // Attempt connection
    await mongoose.connect(process.env.MONGODB_URI || "", {
      serverSelectionTimeoutMS: 5000,
    });

    // Basic database check
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    return res.status(200).json({
      status: "success",
      database: db.databaseName,
      collections: collections.map((c) => c.name),
      connection: sanitizedConnStr,
      env: {
        node_env: process.env.NODE_ENV,
        vercel_env: process.env.VERCEL_ENV,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "failed",
      error: error.message,
      connection: sanitizedConnStr,
      env: {
        node_env: process.env.NODE_ENV,
        vercel_env: process.env.VERCEL_ENV,
      },
    });
  } finally {
    await mongoose.disconnect();
  }
}
