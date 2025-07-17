import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const streams = pgTable("streams", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  streamKey: text("stream_key").notNull(),
  videoPath: text("video_path"),
  quality: text("quality").notNull().default("720p"),
  mode: text("mode").notNull().default("desktop"), // desktop or mobile
  loopVideo: boolean("loop_video").default(false),
  isActive: boolean("is_active").default(false),
  volume: integer("volume").default(75),
  isMuted: boolean("is_muted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const streamStats = pgTable("stream_stats", {
  id: serial("id").primaryKey(),
  streamId: integer("stream_id").notNull(),
  viewerCount: integer("viewer_count").default(0),
  uptime: integer("uptime").default(0), // in seconds
  ping: integer("ping").default(0), // in ms
  connectionStatus: text("connection_status").default("disconnected"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertStreamSchema = createInsertSchema(streams).omit({
  id: true,
  createdAt: true,
});

export const insertStreamStatsSchema = createInsertSchema(streamStats).omit({
  id: true,
  updatedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertStream = z.infer<typeof insertStreamSchema>;
export type Stream = typeof streams.$inferSelect;
export type InsertStreamStats = z.infer<typeof insertStreamStatsSchema>;
export type StreamStats = typeof streamStats.$inferSelect;

// Auth schema
export const loginSchema = z.object({
  accountCode: z.string().min(1, "Account code is required"),
});

export type LoginRequest = z.infer<typeof loginSchema>;

// Stream control schemas
export const streamControlSchema = z.object({
  action: z.enum(["start", "stop"]),
  streamId: z.number(),
});

export type StreamControlRequest = z.infer<typeof streamControlSchema>;
