import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class FileManager {
  constructor(filename) {
    this.filePath = path.join(__dirname, '..', filename);
  }

  async load() {
    try {
      if (!(await fs.access(this.filePath, fs.constants.F_OK)).exists) {
        console.warn(`Файл ${this.filePath} не существует. Возвращаем пустой массив.`);
        return [];
      }
      const data = await fs.readFile(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Ошибка при загрузке файла ${this.filePath}:`, error);
      return [];
    }
  }

  async save(data) {
    try {
      await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Ошибка при сохранении файла ${this.filePath}:`, error);
    }
  }

  async addRecord(record) {
    const data = await this.load();
    data.push(record);
    await this.save(data);
  }

  async removeRecord(predicate) {
    const data = await this.load();
    const filteredData = data.filter(item => !predicate(item));
    await this.save(filteredData);
  }

  async updateRecord(predicate, updater) {
    const data = await this.load();
    const updatedData = data.map(item => predicate(item) ? updater(item) : item);
    await this.save(updatedData);
  }
}
