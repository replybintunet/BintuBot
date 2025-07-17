import { users, streams, streamStats, type User, type InsertUser, type Stream, type InsertStream, type StreamStats, type InsertStreamStats } from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Stream methods
  getStream(id: number): Promise<Stream | undefined>;
  getStreamsByUserId(userId: number): Promise<Stream[]>;
  createStream(stream: InsertStream): Promise<Stream>;
  updateStream(id: number, updates: Partial<Stream>): Promise<Stream | undefined>;
  deleteStream(id: number): Promise<boolean>;
  
  // Stream stats methods
  getStreamStats(streamId: number): Promise<StreamStats | undefined>;
  updateStreamStats(streamId: number, stats: Partial<StreamStats>): Promise<StreamStats | undefined>;
  createStreamStats(stats: InsertStreamStats): Promise<StreamStats>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private streams: Map<number, Stream>;
  private streamStats: Map<number, StreamStats>;
  private currentUserId: number;
  private currentStreamId: number;
  private currentStatsId: number;

  constructor() {
    this.users = new Map();
    this.streams = new Map();
    this.streamStats = new Map();
    this.currentUserId = 1;
    this.currentStreamId = 1;
    this.currentStatsId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getStream(id: number): Promise<Stream | undefined> {
    return this.streams.get(id);
  }

  async getStreamsByUserId(userId: number): Promise<Stream[]> {
    return Array.from(this.streams.values()).filter(
      (stream) => stream.userId === userId
    );
  }

  async createStream(insertStream: InsertStream): Promise<Stream> {
    const id = this.currentStreamId++;
    const stream: Stream = { 
      ...insertStream,
      id,
      videoPath: insertStream.videoPath || null,
      quality: insertStream.quality || '720p',
      mode: insertStream.mode || 'desktop',
      loopVideo: insertStream.loopVideo || false,
      isActive: insertStream.isActive || false,
      volume: insertStream.volume || 75,
      isMuted: insertStream.isMuted || false,
      createdAt: new Date()
    };
    this.streams.set(id, stream);
    
    // Create initial stats for the stream
    await this.createStreamStats({
      streamId: id,
      viewerCount: 0,
      uptime: 0,
      ping: 0,
      connectionStatus: "disconnected"
    });
    
    return stream;
  }

  async updateStream(id: number, updates: Partial<Stream>): Promise<Stream | undefined> {
    const stream = this.streams.get(id);
    if (!stream) return undefined;
    
    const updatedStream = { ...stream, ...updates };
    this.streams.set(id, updatedStream);
    return updatedStream;
  }

  async deleteStream(id: number): Promise<boolean> {
    const deleted = this.streams.delete(id);
    if (deleted) {
      // Also delete associated stats
      const statsEntry = Array.from(this.streamStats.entries()).find(
        ([_, stats]) => stats.streamId === id
      );
      if (statsEntry) {
        this.streamStats.delete(statsEntry[0]);
      }
    }
    return deleted;
  }

  async getStreamStats(streamId: number): Promise<StreamStats | undefined> {
    return Array.from(this.streamStats.values()).find(
      (stats) => stats.streamId === streamId
    );
  }

  async updateStreamStats(streamId: number, updates: Partial<StreamStats>): Promise<StreamStats | undefined> {
    const existingStats = Array.from(this.streamStats.entries()).find(
      ([_, stats]) => stats.streamId === streamId
    );
    
    if (!existingStats) return undefined;
    
    const [id, stats] = existingStats;
    const updatedStats = { 
      ...stats, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.streamStats.set(id, updatedStats);
    return updatedStats;
  }

  async createStreamStats(insertStats: InsertStreamStats): Promise<StreamStats> {
    const id = this.currentStatsId++;
    const stats: StreamStats = { 
      ...insertStats,
      id,
      viewerCount: insertStats.viewerCount || 0,
      uptime: insertStats.uptime || 0,
      ping: insertStats.ping || 0,
      connectionStatus: insertStats.connectionStatus || 'disconnected',
      updatedAt: new Date()
    };
    this.streamStats.set(id, stats);
    return stats;
  }
}

export const storage = new MemStorage();
