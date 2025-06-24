# Django Project Tools

Список полезных команд для разработки.

## 🚀 Основные команды

### Запуск сервера

```bash
python manage.py runserver
```

### Запуск сервера с автоматической перезагрузкой (через django-extensions)

```bash
python manage.py runserver_plus
```

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