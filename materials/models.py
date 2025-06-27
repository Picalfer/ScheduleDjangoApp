import re

from django.db import models
from django.utils.text import slugify
from transliterate import translit


def transliterate_slug(text):
    """Транслитерирует текст и создает slug"""
    try:
        transliterated = translit(text, 'ru', reversed=True)
    except:
        transliterated = text
    return slugify(transliterated)


def guide_upload_path(instance, filename):
    # Формируем путь: courses/{course_slug}/levels/{level_slug}/{guide_slug}/{filename}
    course_slug = transliterate_slug(instance.level.course.title)
    level_slug = transliterate_slug(instance.level.title)
    guide_slug = transliterate_slug(instance.title)
    return f'courses/{course_slug}/levels/{level_slug}/{guide_slug}/{filename}'


def course_cover_upload_path(instance, filename):
    # Формируем путь: courses/{course_slug}/cover.{расширение_файла}
    course_slug = transliterate_slug(instance.title)
    ext = filename.split('.')[-1]
    return f'courses/{course_slug}/cover.{ext}'


class Course(models.Model):
    title = models.CharField("Название курса", max_length=200)
    cover = models.FileField("Обложка", upload_to=course_cover_upload_path, blank=True)
    description = models.TextField("Описание", blank=True)

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = 'Курс'
        verbose_name_plural = 'Курсы'


class Level(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='levels')
    title = models.CharField("Название уровня", max_length=100)
    description = models.TextField("Описание уровня", blank=True)
    order = models.PositiveIntegerField("Порядок", default=0)

    class Meta:
        ordering = ['order']
        unique_together = [('course', 'title')]  # Чтобы названия не повторялись в рамках курса

        verbose_name = 'Уровень'
        verbose_name_plural = 'Уровни'

    def __str__(self):
        return f"{self.course.title} - {self.title}"


class Guide(models.Model):
    level = models.ForeignKey(Level, on_delete=models.CASCADE, related_name='guides')
    title = models.CharField("Название", max_length=200)
    html_file = models.FileField("HTML файл", upload_to=guide_upload_path, null=True, blank=True)
    assets = models.FileField("Ресурсы (zip)", upload_to=guide_upload_path, null=True, blank=True)
    order = models.PositiveIntegerField("Порядок", default=0)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.html_file:  # Если загружен HTML-файл
            self.clean_google_redirects()

    def clean_google_redirects(self):
        """Удаляет google-редиректы из ссылок в HTML."""
        with open(self.html_file.path, 'r+', encoding='utf-8') as f:
            content = f.read()
            # Регулярка для поиска google-редиректов
            cleaned_content = re.sub(
                r'https?://www\.google\.com/url\?q=([^&]+)&[^"]+',
                lambda m: m.group(1),  # Оставляем только оригинальный URL
                content
            )
            f.seek(0)
            f.write(cleaned_content)
            f.truncate()

    def assets_url(self):
        if self.assets:
            return self.assets.url.replace('.zip', '')
        return ''

    class Meta:
        ordering = ['order']
        verbose_name = 'Методичка'
        verbose_name_plural = 'Методички'

    def __str__(self):
        return self.title
