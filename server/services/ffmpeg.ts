import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface StreamConfig {
  id: number;
  videoPath: string;
  streamKey: string;
  quality: string;
  mode: string;
  loopVideo: boolean;
  volume: number;
  isMuted: boolean;
}

export class FFmpegService {
  private activeStreams: Map<number, ChildProcess> = new Map();
  private cleanupCallback?: (streamId: number) => Promise<void>;

  async startStream(config: StreamConfig): Promise<boolean> {
    try {
      // Stop existing stream if running
      if (this.activeStreams.has(config.id)) {
        await this.stopStream(config.id);
      }

      // Validate video file exists
      if (!fs.existsSync(config.videoPath)) {
        throw new Error(`Video file not found: ${config.videoPath}`);
      }

      const args = this.buildFFmpegArgs(config);
      
      const ffmpegProcess = spawn('ffmpeg', args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.activeStreams.set(config.id, ffmpegProcess);

      ffmpegProcess.on('error', (error) => {
        console.error(`FFmpeg error for stream ${config.id}:`, error);
        this.activeStreams.delete(config.id);
      });

      ffmpegProcess.on('exit', async (code) => {
        console.log(`FFmpeg process for stream ${config.id} exited with code ${code}`);
        this.activeStreams.delete(config.id);
        
        // Auto-cleanup video file when stream ends
        try {
          const { fileManager } = await import('./file-manager');
          const { storage } = await import('../storage');
          
          const stream = await storage.getStream(config.id);
          if (stream?.videoPath) {
            console.log(`🧹 Auto-cleanup triggered for stream ${config.id}`);
            const deleted = await fileManager.cleanupStreamFiles(config.id, stream.videoPath);
            await storage.updateStream(config.id, { 
              videoPath: null, 
              isActive: false 
            });
            if (deleted) {
              console.log(`✅ Auto-deleted video file for stream ${config.id}: ${stream.videoPath}`);
            }
          }
        } catch (error) {
          console.error(`❌ Failed to auto-cleanup video for stream ${config.id}:`, error);
        }
      });

      // Give FFmpeg a moment to start
      await new Promise(resolve => setTimeout(resolve, 1000));

      return true;
    } catch (error) {
      console.error(`Failed to start stream ${config.id}:`, error);
      return false;
    }
  }

  async stopStream(streamId: number): Promise<boolean> {
    const process = this.activeStreams.get(streamId);
    if (!process) {
      return false;
    }

    return new Promise((resolve) => {
      process.on('exit', async () => {
        this.activeStreams.delete(streamId);
        
        // Trigger auto-cleanup for this stream
        console.log(`🔄 Stream ${streamId} ended, triggering auto-cleanup...`);
        if (this.cleanupCallback) {
          try {
            await this.cleanupCallback(streamId);
            console.log(`✅ Auto-cleanup completed for stream ${streamId}`);
          } catch (error) {
            console.error(`❌ Auto-cleanup failed for stream ${streamId}:`, error);
          }
        }
        
        resolve(true);
      });

      // Send graceful termination signal
      process.kill('SIGTERM');

      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (this.activeStreams.has(streamId)) {
          process.kill('SIGKILL');
          this.activeStreams.delete(streamId);
          resolve(true);
        }
      }, 5000);
    });
  }

  isStreamActive(streamId: number): boolean {
    return this.activeStreams.has(streamId);
  }

  getActiveStreamIds(): number[] {
    return Array.from(this.activeStreams.keys());
  }

  setCleanupCallback(callback: (streamId: number) => Promise<void>): void {
    this.cleanupCallback = callback;
  }

  private buildFFmpegArgs(config: StreamConfig): string[] {
    const rtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${config.streamKey}`;
    
    let videoFilter = '';
    let audioFilter = '';

    // Video quality settings
    const qualitySettings = this.getQualitySettings(config.quality);
    
    // Mode-specific settings for proper YouTube streaming
    if (config.mode === 'mobile') {
      // Mobile mode: portrait 9:16 aspect ratio for mobile-like streams
      videoFilter = 'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:black';
    } else {
      // Desktop mode: standard landscape 16:9 aspect ratio for desktop/OBS-like streams
      videoFilter = `scale=${qualitySettings.width}:${qualitySettings.height}:force_original_aspect_ratio=decrease,pad=${qualitySettings.width}:${qualitySettings.height}:(ow-iw)/2:(oh-ih)/2:black`;
    }

    // Audio settings
    if (config.isMuted) {
      audioFilter = 'volume=0';
    } else {
      const volumeLevel = config.volume / 100;
      audioFilter = `volume=${volumeLevel}`;
    }

    const args = [
      '-re', // Read input at native frame rate
      '-fflags', '+genpts', // Generate timestamps
    ];

    // Input loop settings
    if (config.loopVideo) {
      args.push('-stream_loop', '-1');
    }

    args.push(
      '-i', config.videoPath,
      '-vf', videoFilter,
      '-af', audioFilter,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-tune', 'zerolatency',
      '-maxrate', qualitySettings.bitrate,
      '-bufsize', qualitySettings.bufsize,
      '-pix_fmt', 'yuv420p',
      '-g', '60', // Keyframe interval
      '-keyint_min', '60',
      '-sc_threshold', '0',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-ac', '2',
      '-f', 'flv',
      rtmpUrl
    );

    return args;
  }

  private getQualitySettings(quality: string) {
    const settings = {
      '360p': { width: 640, height: 360, bitrate: '1000k', bufsize: '2000k' },
      '480p': { width: 854, height: 480, bitrate: '1500k', bufsize: '3000k' },
      '720p': { width: 1280, height: 720, bitrate: '3000k', bufsize: '6000k' },
      '1080p': { width: 1920, height: 1080, bitrate: '6000k', bufsize: '12000k' }
    };

    return settings[quality as keyof typeof settings] || settings['720p'];
  }
}

export const ffmpegService = new FFmpegService();
