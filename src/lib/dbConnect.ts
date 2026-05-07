import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI?.trim();

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}
const MONGODB_URI_REQUIRED = MONGODB_URI as string;

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var mongoose: MongooseCache | undefined;
}

const globalForMongoose = globalThis as typeof globalThis & {
  mongoose?: MongooseCache;
};

const cached = globalForMongoose.mongoose ?? (globalForMongoose.mongoose = { conn: null, promise: null });

function formatConnectionError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  const isMongoConnectionFailure =
    normalized.includes("could not connect to any servers in your mongodb atlas cluster") ||
    normalized.includes("server selection timed out") ||
    normalized.includes("connect etimedout") ||
    normalized.includes("connect econnrefused") ||
    normalized.includes("querysrv enotfound") ||
    normalized.includes("timed out after") ||
    normalized.includes("bad auth") ||
    normalized.includes("authentication failed");

  if (!isMongoConnectionFailure) {
    return error instanceof Error ? error : new Error(message);
  }

  const isAuthIssue = normalized.includes("bad auth") || normalized.includes("authentication failed");
  const guidance = isAuthIssue
    ? "Failed to authenticate with MongoDB Atlas. Verify MONGODB_URI username/password, auth database, and special-character escaping in .env.local, then restart the app."
    : "Failed to connect to MongoDB Atlas. Add your current public IP to Atlas Network Access, verify database user credentials, and restart the app after updating .env.local. Atlas Network Access: https://cloud.mongodb.com/v2#/security/network/accessList";

  const wrapped = new Error(`${guidance}\n\nOriginal error: ${message}`);
  wrapped.name = "MongoConnectionError";
  return wrapped;
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI_REQUIRED, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 15_000,
      connectTimeoutMS: 15_000,
      socketTimeoutMS: 30_000,
      family: 4,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw formatConnectionError(error);
  }

  return cached.conn;
}

export default dbConnect;
