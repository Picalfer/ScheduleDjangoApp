# Этап сборки (builder)
FROM python:3.10-slim-buster as builder

WORKDIR /app

# Установка системных зависимостей только для сборки
RUN apt-get update --yes --quiet && \
    apt-get install --yes --quiet --no-install-recommends \
    build-essential \
    libpq-dev \
    libjpeg62-turbo-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Установка Python-зависимостей с кэшированием
COPY ./requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Финальный этап
FROM python:3.10-slim-buster

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    DJANGO_SETTINGS_MODULE=scheduleApp.settings \
    PORT=8000 \
    WEB_CONCURRENCY=3 \
    PATH="/home/django/.local/bin:${PATH}"

# Установка только runtime-зависимостей
RUN apt-get update --yes --quiet && \
    apt-get install --yes --quiet --no-install-recommends \
    libpq5 \
    libjpeg62-turbo \
    zlib1g \
    && rm -rf /var/lib/apt/lists/*

# Создание пользователя
RUN addgroup --system django && \
    adduser --system --ingroup django django

# Копирование установленных пакетов из builder
COPY --from=builder --chown=django:django /root/.local /home/django/.local
COPY --chown=django:django . .

# Сборка статики
RUN if [ -f "manage.py" ]; then \
        python manage.py collectstatic --noinput --clear; \
    else \
        echo "Warning: manage.py not found, skipping collectstatic"; \
    fi

USER django

CMD ["gunicorn", "scheduleApp.wsgi:application", "--bind", "0.0.0.0:$PORT"]