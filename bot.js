import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import dotenv from 'dotenv';
import { config } from './config.js';
import { FileManager } from './utils/fileManager.js';
import { MediaDownloader } from './services/mediaDownloader.js';
import { TranslationService } from './services/translationService.js';
import winston from 'winston';
import rateLimit from 'express-rate-limit';

dotenv.config();

if (!process.env.BOT_TOKEN) {
    console.error('BOT_TOKEN not found in environment variables');
    process.exit(1);
}

// Настройка логгера
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console()
    ]
});

// Функция для поиска свободного порта
const findFreePort = async (startPort) => {
    const net = await import('net');
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                server.listen(startPort + 1); // Пробуем следующий порт
            } else {
                reject(err);
            }
        });
        server.on('listening', () => {
            const { port } = server.address();
            server.close(() => resolve(port));
        });
        server.listen(startPort); // Пробуем начать с указанного порта
    });
};

class TelegramMediaBot {
    constructor() {
        // Используем порт из env или находим свободный
        const startPort = parseInt(process.env.PORT || '8080', 10);

        findFreePort(startPort).then(port => {
            this.port = port; // Присваиваем найденный порт

            this.bot = new TelegramBot(process.env.BOT_TOKEN, {
                webHook: {
                    port: this.port
                }
            });

            this.advertiserManager = new FileManager('advertiser_channels.json');
            this.translationService = new TranslationService();
            this.userDownloads = {};
            this.advertiserChannels = this.advertiserManager.load();

            this.initializeExpressServer(this.port);
            this.initializeWebhook();
            this.initializeHandlers();
        }).catch(error => {
            logger.error('Ошибка при инициализации бота:', error);
            process.exit(1);
        });
    }

    async initializeWebhook() {
        const webhookUrl = process.env.WEBHOOK_URL ||
            'https://fullsaveinstabot-655796952703.europe-west1.run.app';

        try {
            await this.bot.deleteWebHook();
            await this.bot.setWebHook(`${webhookUrl}/webhook`);
            logger.info('Webhook установлен успешно:', webhookUrl);
        } catch (error) {
            logger.error('Ошибка при установке webhook:', error);
            logger.error('Детали ошибки:', error.response?.body || error.message);
        }
    }

    initializeExpressServer(port) {
        this.app = express();
        this.port = port;

        // Настройка ограничения скорости запросов
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 минут
            max: 100 // ограничить каждый IP до 100 запросов на окно
        });

        this.app.use(limiter);
        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

        this.app.get('/', (req, res) => {
            res.send('Telegram Bot is running!');
        });

        this.app.get('/status', (req, res) => {
            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                port: this.port,
                botInfo: {
                    username: this.bot.botInfo?.username || 'not initialized',
                    startTime: process.uptime()
                }
            });
        });

        this.app.post('/webhook', (req, res) => {
            try {
                this.bot.processUpdate(req.body);
                res.sendStatus(200);
            } catch (error) {
                logger.error('Ошибка обработки webhook:', error);
                res.sendStatus(500);
            }
        });

        this.app.listen(this.port, '0.0.0.0', () => {
            logger.info(`Сервер запущен на порту ${this.port}`);
            logger.info(`Текущие переменные окружения: PORT=${this.port}`);
        });
    }

    initializeHandlers() {
        this.bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;
            const lang = this.translationService.getUserLanguage(msg.from);
            await this.bot.sendMessage(chatId, this.translationService.getTranslation(lang, 'welcome'));
        });

        this.bot.onText(/\/help/, async (msg) => {
            const chatId = msg.chat.id;
            const lang = this.translationService.getUserLanguage(msg.from);
            await this.bot.sendMessage(chatId, this.translationService.getTranslation(lang, 'help'));
        });

        this.bot.on('text', async (msg) => {
            const chatId = msg.chat.id;
            const url = msg.text;
            const lang = this.translationService.getUserLanguage(msg.from);
            if (this.isValidUrl(url)) {
                await this.handleMediaDownload(chatId, url, lang);
            } else {
                await this.bot.sendMessage(chatId, this.translationService.getTranslation(lang, 'invalid_url'));
            }
        });
    }

    isValidUrl(string) {
        try {
            const url = new URL(string);
            const supportedDomains = ['instagram.com', 'tiktok.com', 'youtube.com', 'youtu.be'];
            return supportedDomains.some(domain => url.hostname.includes(domain));
        } catch (_) {
            return false;
        }
    }

    async handleMediaDownload(chatId, url, lang) {
        try {
            await this.bot.sendMessage(chatId, this.translationService.getTranslation(lang, 'download_start'));
            const mediaUrl = await MediaDownloader.getDownloadUrl(url);
            try {
                await this.bot.sendVideo(chatId, mediaUrl, { caption: `${this.translationService.getTranslation(lang, 'source')}: ${url}` });
                logger.info(`Видео успешно отправлено пользователю ${chatId}`);
                this.updateUserStats(chatId, 'success');
            } catch (sendError) {
                logger.error('Ошибка при отправке видео:', sendError);
                if (sendError.code === 'ETELEGRAM' && sendError.response.body.description.includes('file is too big')) {
                    await this.bot.sendMessage(chatId, this.translationService.getTranslation(lang, 'file_too_large') + " " + mediaUrl);
                } else {
                    await this.bot.sendMessage(chatId, this.translationService.getTranslation(lang, 'send_error'));
                }
                this.updateUserStats(chatId, 'fail');
            }
        } catch (error) {
            logger.error('Ошибка при загрузке медиа:', error);
            await this.bot.sendMessage(chatId, this.translationService.getTranslation(lang, 'download_error'));
            this.updateUserStats(chatId, 'fail');
        }
    }

    updateUserStats(chatId, result) {
        if (!this.userDownloads[chatId]) {
            this.userDownloads[chatId] = { success: 0, fail: 0 };
        }
        this.userDownloads[chatId][result]++;
    }
}

// Создаем экземпляр бота и обрабатываем ошибки
try {
    const bot = new TelegramMediaBot();
    logger.info('Bot is running...');

    process.on('uncaughtException', (error) => {
        logger.error('Необработанное исключение:', error);
    });

    process.on('unhandledRejection', (error) => {
        logger.error('Необработанное отклонение промиса:', error);
    });

    process.on('SIGTERM', () => {
        logger.info('SIGTERM received. Performing graceful shutdown...');
        bot.bot.close();
        process.exit(0);
    });
} catch (error) {
    logger.error('Ошибка при запуске бота:', error);
    process.exit(1);
}

export default TelegramMediaBot;
