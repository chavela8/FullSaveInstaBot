import axios from 'axios';
import ytdl from 'ytdl-core';
import pkg from '@tobyg74/tiktok-api-dl';
const { TiktokDL } = pkg;

export class MediaDownloader {
    static async getDownloadUrl(url) {
        if (url.includes('instagram.com')) {
            return await this.getInstagramUrl(url);
        }

        if (url.includes('tiktok.com')) {
            return await this.getTiktokUrl(url);
        }

        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            return await this.getYoutubeUrl(url);
        }

        throw new Error('Неподдерживаемый URL');
    }

    static async getInstagramUrl(url, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await axios.get(`https://api.instagram.com/oembed/?url=${url}`, {
                    responseType: 'json',
                    maxContentLength: 500 * 1024 * 1024 // Увеличен лимит до 500MB
                });
                if (response.data && response.data.thumbnail_url) {
                    return response.data.thumbnail_url;
                }
                throw new Error('Некорректный ответ от Instagram API');
            } catch (error) {
                console.error(`Попытка ${i + 1}/${retries}: Ошибка при получении контента из Instagram:`, error);
                if (i === retries - 1) throw new Error('Не удалось скачать контент из Instagram');
                await new Promise(resolve => setTimeout(resolve, 1000)); // Ждем 1 секунду перед повторной попыткой
            }
        }
    }

    static async getTiktokUrl(url, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const result = await TiktokDL(url, { version: 'v1' });
                if (result.status === 'success' && result.result.video && result.result.video[0]) {
                    return result.result.video[0];
                }
                throw new Error(result.message || 'Некорректный ответ от TikTok API');
            } catch (error) {
                console.error(`Попытка ${i + 1}/${retries}: Ошибка при получении контента из TikTok:`, error);
                if (i === retries - 1) throw new Error('Не удалось скачать контент из TikTok');
                await new Promise(resolve => setTimeout(resolve, 1000)); // Ждем 1 секунду перед повторной попыткой
            }
        }
    }

    static async getYoutubeUrl(url, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const info = await ytdl.getInfo(url);
                const format = ytdl.chooseFormat(info.formats, { quality: 'highest' });
                if (format && format.url) {
                    return format.url;
                }
                throw new Error('Некорректный ответ от YouTube API');
            } catch (error) {
                console.error(`Попытка ${i + 1}/${retries}: Ошибка при получении контента из YouTube:`, error);
                if (i === retries - 1) throw new Error('Не удалось скачать контент из YouTube');
                await new Promise(resolve => setTimeout(resolve, 1000)); // Ждем 1 секунду перед повторной попыткой
            }
        }
    }

    static isValidUrl(text) {
        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        return urlPattern.test(text) ? text : null;
    }
}
