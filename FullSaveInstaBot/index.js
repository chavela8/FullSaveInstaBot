import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { config } from './config.js';
import { FileManager } from './utils/fileManager.js';
import { MediaDownloader } from './services/mediaDownloader.js';
import { TranslationService } from './services/translationService.js';

dotenv.config();

if (!process.env.BOT_TOKEN) {
  console.error('BOT_TOKEN not found in environment variables');
  process.exit(1);
}

class TelegramMediaBot {
  constructor() {
    this.bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
    this.advertiserManager = new FileManager('advertiser_channels.json');
    this.translationService = new TranslationService();
    this.userDownloads = {};
    this.advertiserChannels = this.advertiserManager.load();

    this.initializeHandlers();
  }

  initializeHandlers() {
    this.bot.onText(/\/start/, this.handleStart.bind(this));
    this.bot.on('message', this.handleMessage.bind(this));
  }

  handleStart(msg) {
    const chatId = msg.chat.id;
    const langCode = this.translationService.getUserLanguage(msg.from);
    this.bot.sendMessage(
      chatId,
      this.translationService.getTranslation(langCode, 'welcome')
    );
  }

  async handleMessage(msg) {
    const chatId = msg.chat.id;
    const messageText = msg.text;
    const langCode = this.translationService.getUserLanguage(msg.from);

    if (!messageText) return;

    try {
      const url = MediaDownloader.isValidUrl(messageText);
      if (!url) {
        this.bot.sendMessage(
          chatId,
          this.translationService.getTranslation(langCode, 'invalidUrl')
        );
        return;
      }

      if (this.checkDownloadLimit(chatId)) {
        const channel = this.getRandomAdvertiserChannel();
        if (channel) {
          this.bot.sendMessage(
            chatId,
            this.translationService
              .getTranslation(langCode, 'subscribeRequest')
              .replace('{channelLink}', channel.link)
          );
          return;
        }
      }

      const processingMsg = await this.bot.sendMessage(
        chatId,
        this.translationService.getTranslation(langCode, 'processing')
      );

      const downloadUrl = await MediaDownloader.getDownloadUrl(url);

      await this.bot.sendVideo(chatId, downloadUrl, {
        caption: this.translationService
          .getTranslation(langCode, 'sourceLink')
          .replace('{sourceLink}', url),
      });

      this.incrementDownloads(chatId);
      this.bot.deleteMessage(chatId, processingMsg.message_id);
    } catch (error) {
      console.error('Error:', error);
      this.bot.sendMessage(
        chatId,
        this.translationService.getTranslation(langCode, 'error')
      );
    }
  }

  checkDownloadLimit(chatId) {
    if (!this.userDownloads[chatId]) {
      this.userDownloads[chatId] = 0;
    }
    return this.userDownloads[chatId] >= config.DOWNLOADS_LIMIT;
  }

  incrementDownloads(chatId) {
    if (!this.userDownloads[chatId]) {
      this.userDownloads[chatId] = 0;
    }
    this.userDownloads[chatId]++;
  }

  getRandomAdvertiserChannel() {
    if (this.advertiserChannels.length === 0) return null;
    const randomIndex = Math.floor(
      Math.random() * this.advertiserChannels.length
    );
    return this.advertiserChannels[randomIndex];
  }
}

const bot = new TelegramMediaBot();
console.log('Bot is running...');
