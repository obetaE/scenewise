import mongoose from "mongoose";
import "dotenv/config";

const connectionState = {
  isConnected: false,
};

export const connectDB = async () => {
  if (connectionState.isConnected) {
    console.log("Using existing database connection");
    return;
  }

  try {
    // Same Atlas cluster as your book app, but its own database name —
    // "scenewise" — so the two projects' collections never mix.
    const mongoConnect = await mongoose.connect(process.env.MONGO_URI as string, {
      dbName: "scenewise",
    });
    connectionState.isConnected = mongoConnect.connection.readyState === 1;
    console.log(`Database connected: ${mongoConnect.connection.host} (db: scenewise)`);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};
