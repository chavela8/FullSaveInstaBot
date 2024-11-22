import { execSync } from 'child_process';

// Вспомогательная функция для выполнения команд и логирования вывода
function runCommand(command) {
  console.log(`Выполняется: ${command}`);
  try {
    const output = execSync(command, { encoding: 'utf8' });
    console.log(output);
  } catch (error) {
    console.error(`Ошибка: ${error.message}`);
  }
}

// Обновление зависимостей
console.log('1. Сначала обновим npm до последней версии:');
runCommand('npm install -g npm@latest');

console.log('\n2. Удалим устаревшие пакеты:');
runCommand('npm uninstall request request-promise request-promise-core har-validator');

console.log('\n3. Установим современные альтернативы:');
runCommand('npm install node-fetch@2 # или axios, если предпочитаете');

console.log('\n4. Исправим уязвимости безопасности:');
runCommand('npm audit fix --force');

console.log('\n5. Очистим кэш npm:');
runCommand('npm cache clean --force');

console.log('\nРекомендуемые следующие шаги:');
console.log('1. Обновите ваш код, чтобы использовать node-fetch или axios вместо request');
console.log('2. Просмотрите изменения в package.json');
console.log('3. Запустите ваши тесты, чтобы убедиться, что всё работает');
