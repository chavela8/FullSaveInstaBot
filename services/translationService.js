import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TranslationService {
  constructor() {
    this.translations = {};
    this.loadTranslations();
  }

  loadTranslations() {
    config.SUPPORTED_LANGUAGES.forEach(lang => {
      const langFile = path.join(__dirname, '..', `lang/${lang}.json`);
      try {
        const data = fs.readFileSync(langFile, 'utf8');
        this.translations[lang] = JSON.parse(data);
      } catch (error) {
        console.error(`Ошибка загрузки языкового файла ${lang}:`, error);
      }
    });
  }

  getUserLanguage(user) {
    return user.language_code && config.SUPPORTED_LANGUAGES.includes(user.language_code)
      ? user.language_code
      : config.DEFAULT_LANGUAGE;
  }

  getTranslation(langCode, key) {
    const translation = this.translations[langCode]?.[key] ||
                        this.translations[config.DEFAULT_LANGUAGE][key] ||
                        this.translations['en'][key];

    if (!translation) {
      console.warn(`Перевод для ключа "${key}" не найден в языке ${langCode}`);
      return key; // Возвращаем ключ, если перевод не найден
    }

    return translation;
  }

  reloadTranslations() {
    this.translations = {};
    this.loadTranslations();
    console.log('Переводы успешно перезагружены');
  }
}
