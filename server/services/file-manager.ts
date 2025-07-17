import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const unlinkAsync = promisify(fs.unlink);
const existsAsync = promisify(fs.exists);

export class FileManager {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadsDir();
  }

  private ensureUploadsDir() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  getUploadsDir(): string {
    return this.uploadsDir;
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      if (await existsAsync(filePath)) {
        await unlinkAsync(filePath);
        console.log(`✅ Successfully deleted file: ${filePath}`);
        return true;
      } else {
        console.log(`⚠️ File not found for deletion: ${filePath}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Failed to delete file ${filePath}:`, error);
      return false;
    }
  }

  async cleanupStreamFiles(streamId: number, videoPath?: string): Promise<boolean> {
    if (videoPath) {
      console.log(`🗑️ Cleaning up video file for stream ${streamId}: ${videoPath}`);
      return await this.deleteFile(videoPath);
    }
    return false;
  }

  generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    return `${name}_${timestamp}_${random}${ext}`;
  }

  getFilePath(filename: string): string {
    return path.join(this.uploadsDir, filename);
  }

  isValidVideoFile(filename: string): boolean {
    const allowedExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    const ext = path.extname(filename).toLowerCase();
    return allowedExtensions.includes(ext);
  }
}

export const fileManager = new FileManager();
