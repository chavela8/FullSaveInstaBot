import { addAdvertiserChannel, loadAdvertiserChannels } from './bot.js';

// Загрузка существующих каналов
loadAdvertiserChannels();

// Добавление новых каналов
addAdvertiserChannel('Мировой БЕСпорядок', 'https://t.me/mirovoy_besporyadok');

console.log('Новые каналы добавлены успешно');
