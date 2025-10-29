FROM python:3.10-slim-buster

# ВРЕМЕННОЕ ИСПРАВЛЕНИЕ: Обновляем источники для доступа к архивным репозиториям
RUN sed -i 's/deb.debian.org/archive.debian.org/g' /etc/apt/sources.list && \
    sed -i 's|security.debian.org|archive.debian.org/debian-security|g' /etc/apt/sources.list && \
    sed -i '/buster-updates/d' /etc/apt/sources.list

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    DJANGO_SETTINGS_MODULE=scheduleApp.settings \
    PORT=8000 \
    WEB_CONCURRENCY=3 \
    DJANGO_DEBUG=False

# Установка системных зависимостей
RUN apt-get update --yes --quiet && \
    apt-get install --yes --quiet --no-install-recommends \
    build-essential \
    curl \
    libpq-dev \
    libmariadbclient-dev \
    libjpeg62-turbo-dev \
    zlib1g-dev \
    libwebp-dev && \
    rm -rf /var/lib/apt/lists/*

# Создание пользователя
RUN addgroup --system django && \
    adduser --system --ingroup django django

# Установка Python-зависимостей
COPY ./requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование проекта (исключая ненужные файлы через .dockerignore)
COPY . .

# Сборка статики (перед сборкой папка очистится)
RUN python manage.py collectstatic --noinput --clear;

# Права на файлы
RUN chown -R django:django /app

# Переключаемся на непривилегированного пользователя
USER django

# Команда запуска (исправлен формат для надежности)
# !!! На сервере вместо команды CMD запускается Procfile
CMD ["gunicorn", "schedule_app.wsgi:application", "--bind", "0.0.0.0:$PORT"]