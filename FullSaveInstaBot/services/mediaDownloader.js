import { instagramDl, tiktokDl } from '@bochilteam/scraper';
import ytdl from 'ytdl-core';

export class MediaDownloader {
  static async getDownloadUrl(url) {
    if (url.includes('instagram.com')) {
      const result = await instagramDl(url);
      return result[0].url;
    }
    
    if (url.includes('tiktok.com')) {
      const result = await tiktokDl(url);
      return result.video[0];
    }
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const info = await ytdl.getInfo(url);
      const format = ytdl.chooseFormat(info.formats, { quality: 'highestvideo' });
      return format.url;
    }
    
    throw new Error('Unsupported URL');
  }

  static isValidUrl(text) {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return text.match(urlPattern)?.[0];
  }
}