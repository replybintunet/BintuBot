import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer, { FileFilterCallback, MulterError } from "multer";
import path from "path";
import { storage } from "./storage";
import { ffmpegService } from "./services/ffmpeg";
import { fileManager } from "./services/file-manager";
import { loginSchema, insertStreamSchema, streamControlSchema } from "@shared/schema";

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
      cb(null, fileManager.getUploadsDir());
    },
    filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      const uniqueName = fileManager.generateUniqueFilename(file.originalname);
      cb(null, uniqueName);
    }
  }),
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (fileManager.isValidVideoFile(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  },
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store connected clients
  const clients = new Set<WebSocket>();

  // Aggressive cleanup: Delete all existing uploads on startup
  const cleanupOnStartup = async () => {
    try {
      const fs = await import('fs');
      const uploadsDir = fileManager.getUploadsDir();
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        if (file !== '.gitkeep') {
          const filePath = `${uploadsDir}/${file}`;
          await fileManager.deleteFile(filePath);
          console.log(`🗑️ Startup cleanup: Removed ${file}`);
        }
      }
      console.log(`✅ Startup cleanup completed - ${files.length} files removed`);
    } catch (error) {
      console.log('No files to cleanup on startup');
    }
  };
  
  await cleanupOnStartup();

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Client connected to WebSocket');

    ws.on('close', () => {
      clients.delete(ws);
      console.log('Client disconnected from WebSocket');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  // Broadcast function for real-time updates
  const broadcast = (data: any) => {
    const message = JSON.stringify(data);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // Auth endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { accountCode } = loginSchema.parse(req.body);
      
      // Demo authentication
      if (accountCode === 'bintunet') {
        // Create demo user if doesn't exist
        let user = await storage.getUserByUsername('demo');
        if (!user) {
          user = await storage.createUser({
            username: 'demo',
            password: 'demo'
          });
        }
        
        res.json({ 
          success: true, 
          user: { id: user.id, username: user.username }
        });
      } else {
        res.status(401).json({ message: 'Invalid account code' });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({ message: 'Invalid request' });
    }
  });

  // Get user streams
  app.get('/api/streams/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const streams = await storage.getStreamsByUserId(userId);
      
      // Add stats to each stream
      const streamsWithStats = await Promise.all(
        streams.map(async (stream) => {
          const stats = await storage.getStreamStats(stream.id);
          return { ...stream, stats };
        })
      );
      
      res.json(streamsWithStats);
    } catch (error) {
      console.error('Get streams error:', error);
      res.status(500).json({ message: 'Failed to fetch streams' });
    }
  });

  // Create new stream (unlimited)
  app.post('/api/streams', async (req, res) => {
    try {
      const streamData = insertStreamSchema.parse(req.body);
      const stream = await storage.createStream(streamData);
      
      res.json(stream);
      
      // Broadcast update
      broadcast({ type: 'streamCreated', stream });
    } catch (error) {
      console.error('Create stream error:', error);
      res.status(400).json({ message: 'Failed to create stream' });
    }
  });

  // Update stream
  app.put('/api/streams/:id', async (req, res) => {
    try {
      const streamId = parseInt(req.params.id);
      const updates = req.body;
      
      const stream = await storage.updateStream(streamId, updates);
      if (!stream) {
        return res.status(404).json({ message: 'Stream not found' });
      }
      
      res.json(stream);
      
      // Broadcast update
      broadcast({ type: 'streamUpdated', stream });
    } catch (error) {
      console.error('Update stream error:', error);
      res.status(400).json({ message: 'Failed to update stream' });
    }
  });

  // Delete stream
  app.delete('/api/streams/:id', async (req, res) => {
    try {
      const streamId = parseInt(req.params.id);
      
      // Get stream before deletion for cleanup
      const stream = await storage.getStream(streamId);
      if (!stream) {
        return res.status(404).json({ message: 'Stream not found' });
      }

      // Stop stream if active
      if (ffmpegService.isStreamActive(streamId)) {
        await ffmpegService.stopStream(streamId);
      }

      // Cleanup files
      if (stream.videoPath) {
        await fileManager.cleanupStreamFiles(streamId, stream.videoPath);
      }

      // Delete from storage
      const deleted = await storage.deleteStream(streamId);
      if (!deleted) {
        return res.status(404).json({ message: 'Stream not found' });
      }

      res.json({ success: true });
      
      // Broadcast update
      broadcast({ type: 'streamDeleted', streamId });
    } catch (error) {
      console.error('Delete stream error:', error);
      res.status(500).json({ message: 'Failed to delete stream' });
    }
  });

  // Upload video file with immediate cleanup scheduling
  app.post('/api/upload', upload.single('video'), async (req: Request & { file?: Express.Multer.File }, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const filePath = req.file.path;
      const fileName = req.file.filename;
      
      // Schedule cleanup after 30 minutes if not used
      setTimeout(async () => {
        try {
          await fileManager.deleteFile(filePath);
          console.log(`🗑️ Auto-cleanup: Removed unused file ${fileName} after 30 minutes`);
        } catch (error) {
          console.log(`File ${fileName} already cleaned up or in use`);
        }
      }, 30 * 60 * 1000); // 30 minutes
      
      res.json({
        filename: fileName,
        path: filePath,
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: 'Upload failed' });
    }
  });

  // Stream control (start/stop)
  app.post('/api/streams/:id/control', async (req, res) => {
    try {
      const streamId = parseInt(req.params.id);
      const { action } = streamControlSchema.parse(req.body);
      
      const stream = await storage.getStream(streamId);
      if (!stream) {
        return res.status(404).json({ message: 'Stream not found' });
      }

      if (action === 'start') {
        if (!stream.videoPath) {
          return res.status(400).json({ message: 'No video file uploaded' });
        }

        const success = await ffmpegService.startStream({
          id: stream.id,
          videoPath: stream.videoPath,
          streamKey: stream.streamKey,
          quality: stream.quality,
          mode: stream.mode,
          loopVideo: stream.loopVideo || false,
          volume: stream.volume || 75,
          isMuted: stream.isMuted || false
        });

        if (success) {
          await storage.updateStream(streamId, { isActive: true });
          await storage.updateStreamStats(streamId, { 
            connectionStatus: 'connected',
            uptime: 0
          });
          
          res.json({ success: true, message: 'Stream started' });
          broadcast({ type: 'streamStarted', streamId });
        } else {
          res.status(500).json({ message: 'Failed to start stream' });
        }
      } else if (action === 'stop') {
        const success = await ffmpegService.stopStream(streamId);
        
        await storage.updateStream(streamId, { isActive: false });
        await storage.updateStreamStats(streamId, { 
          connectionStatus: 'disconnected' 
        });

        // Immediate cleanup files after stopping stream
        if (stream.videoPath) {
          console.log(`🗑️ Immediate cleanup: Deleting ${stream.videoPath}`);
          await fileManager.deleteFile(stream.videoPath);
          await storage.updateStream(streamId, { videoPath: null });
          console.log(`✅ Video file removed for stream ${streamId}`);
        }

        res.json({ success: true, message: 'Stream stopped' });
        broadcast({ type: 'streamStopped', streamId });
      }
    } catch (error) {
      console.error('Stream control error:', error);
      res.status(400).json({ message: 'Invalid request' });
    }
  });

  // Get stream stats
  app.get('/api/streams/:id/stats', async (req, res) => {
    try {
      const streamId = parseInt(req.params.id);
      const stats = await storage.getStreamStats(streamId);
      
      if (!stats) {
        return res.status(404).json({ message: 'Stats not found' });
      }
      
      res.json(stats);
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

  // Simulate real-time stats updates
  setInterval(async () => {
    const activeStreamIds = ffmpegService.getActiveStreamIds();
    
    for (const streamId of activeStreamIds) {
      const currentStats = await storage.getStreamStats(streamId);
      if (currentStats && currentStats.connectionStatus === 'connected') {
        // Simulate realistic stats
        const newViewerCount = Math.max(0, (currentStats.viewerCount || 0) + Math.floor(Math.random() * 20) - 10);
        const newUptime = (currentStats.uptime || 0) + 5; // 5 seconds
        const newPing = 15 + Math.floor(Math.random() * 20); // 15-35ms
        
        await storage.updateStreamStats(streamId, {
          viewerCount: newViewerCount,
          uptime: newUptime,
          ping: newPing
        });

        // Broadcast real-time updates
        broadcast({
          type: 'statsUpdate',
          streamId,
          stats: {
            viewerCount: newViewerCount,
            uptime: newUptime,
            ping: newPing,
            connectionStatus: 'connected'
          }
        });
      }
    }
  }, 5000); // Update every 5 seconds

  return httpServer;
}
