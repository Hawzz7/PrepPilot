import mongoose, { connect } from "mongoose";
import dns from "dns";

dns.setServers([
  "1.1.1.1",
  "8.8.8.8"
]);

const connectDB = async () => {
  try {
    console.log("Mongo URL:", process.env.MONGODB_URL);
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Database connected successfully");
  } catch (error) {
    console.error("error:", error);
    process.exit(1);
  }
};

export default connectDB;
