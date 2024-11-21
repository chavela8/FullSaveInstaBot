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

        throw new Error('���������������� URL');
    }

    static async getInstagramUrl(url, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await axios.get(`https://api.instagram.com/oembed/?url=${url}`, {
                    responseType: 'json',
                    maxContentLength: 500 * 1024 * 1024 // �������� ����� �� 500MB
                });
                if (response.data && response.data.thumbnail_url) {
                    return response.data.thumbnail_url;
                }
                throw new Error('������������ ����� �� Instagram API');
            } catch (error) {
                console.error(`������� ${i + 1}/${retries}: ������ ��� ��������� �������� �� Instagram:`, error);
                if (i === retries - 1) throw new Error('�� ������� ������� ������� �� Instagram');
                await new Promise(resolve => setTimeout(resolve, 1000)); // ���� 1 ������� ����� ��������� ��������
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
                throw new Error(result.message || '������������ ����� �� TikTok API');
            } catch (error) {
                console.error(`������� ${i + 1}/${retries}: ������ ��� ��������� �������� �� TikTok:`, error);
                if (i === retries - 1) throw new Error('�� ������� ������� ������� �� TikTok');
                await new Promise(resolve => setTimeout(resolve, 1000)); // ���� 1 ������� ����� ��������� ��������
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
                throw new Error('������������ ����� �� YouTube API');
            } catch (error) {
                console.error(`������� ${i + 1}/${retries}: ������ ��� ��������� �������� �� YouTube:`, error);
                if (i === retries - 1) throw new Error('�� ������� ������� ������� �� YouTube');
                await new Promise(resolve => setTimeout(resolve, 1000)); // ���� 1 ������� ����� ��������� ��������
            }
        }
    }

    static isValidUrl(text) {
        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        return urlPattern.test(text) ? text : null;
    }
}
