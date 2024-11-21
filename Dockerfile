# Этап сборки
FROM node:20-slim AS builder

# Устанавливаем переменные окружения
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1

# Устанавливаем необходимые пакеты для сборки
RUN apt-get update && \
    apt-get install -y apt-utils && \
    apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Создаем директорию приложения
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install && \
    npm cache clean --force

# Этап финальной сборки
FROM node:20-slim

# Копируем переменные окружения
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1

# Устанавливаем только необходимые runtime пакеты
RUN apt-get update && \
    apt-get install -y apt-utils && \
    apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Создаем директорию приложения
WORKDIR /app

# Копируем файлы из этапа сборки
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Создаем необходимые директории
RUN mkdir -p lang data

# Указываем порт
EXPOSE 8080

# Запускаем приложение
CMD ["node", "bot.js"]