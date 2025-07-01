# Django Project Tools

Список полезных команд для разработки.

## 🥱 Основные команды

### Запуск сервера

```bash
python manage.py runserver
```

## 🚀 Пуш

### Пуш на тестовй сервер

```bash
git push dokku-test develop  
```

### Пуш на продакт сервер

git push dokku master

* Вводить вручную
* Не забудьте после пуша применить миграции на сервере

## 🛠 Команды для работы с миграциями

### Создать миграции

```bash
python manage.py makemigrations
```

### Применить миграции

```bash
python manage.py migrate
```

### 📊 Генерация ERD-диаграмм

#### Для работы команд требуется:

* django-extensions (устанавливается в dev-режиме)
* pydot или pygraphviz (для генерации диаграмм)

#### Простая диаграмма (только связи)

```bash
python manage.py graph_models --pydot -a --group-models --disable-fields -o erd.png
```

#### Подробная диаграмма (с полями моделей)

```bash
python manage.py graph_models --pydot -a --group-models -o erd_detailed.png
```

### Установка зависимостей

```bash
pip install -r requirements.txt
```