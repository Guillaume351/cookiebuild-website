import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "";

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create the PostgreSQL client with proper configuration
const client = postgres(connectionString, {
  prepare: false, // Disable prepared statements to avoid schema issues
});

// Create Drizzle ORM instance with schema
const db = drizzle(client, {
  schema,
  logger: process.env.NODE_ENV !== "production",
});

export default db;
