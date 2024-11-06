import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class FileManager {
  constructor(filename) {
    this.filePath = path.join(__dirname, '..', filename);
  }

  load() {
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error loading file ${this.filePath}:`, error);
      return [];
    }
  }

  save(data) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error saving file ${this.filePath}:`, error);
    }
  }
}