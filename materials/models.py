import os
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
    folder_slug = models.SlugField(max_length=200, blank=True, editable=False)

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = 'Курс'
        verbose_name_plural = 'Курсы'

    def save(self, *args, **kwargs):
        # Генерируем slug папки только при первом создании курса
        if not self.folder_slug:
            self.folder_slug = transliterate_slug(self.title)
        super().save(*args, **kwargs)


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

    def unpack_assets(self):
        """Распаковывает архив с ресурсами и удаляет его"""
        import zipfile
        import os

        if not self.assets:
            return

        target_dir = os.path.dirname(self.html_file.path) if self.html_file else os.path.dirname(self.assets.path)

        try:
            # Распаковываем архив
            with zipfile.ZipFile(self.assets.path, 'r') as zip_ref:
                zip_ref.extractall(target_dir)
            print(f"Архив успешно распакован в {target_dir}")

            # Удаляем ZIP-архив после распаковки
            os.remove(self.assets.path)
            print(f"Архив {self.assets.path} удалён")

            # Обновляем поле assets в модели (очищаем)
            self.assets = None
            self.save(update_fields=['assets'])

        except Exception as e:
            print(f"Ошибка: {e}")

    def assets_url(self):
        """Возвращает URL папки с ресурсами"""
        if self.html_file:
            return os.path.dirname(self.html_file.url) + '/'
        return ''

    def save(self, *args, **kwargs):
        # Получаем старую версию объекта (если есть)
        old_assets = None
        if self.pk:
            old_guide = Guide.objects.get(pk=self.pk)
            old_assets = old_guide.assets

        super().save(*args, **kwargs)

        if self.html_file:
            self.clean_google_redirects()

        # Распаковываем архив, если он есть и изменился
        if self.assets and self.assets != old_assets:
            self.unpack_assets()

    def clean_google_redirects(self):
        """Удаляет google-редиректы из ссылок в HTML."""
        with open(self.html_file.path, 'r+', encoding='utf-8') as f:
            content = f.read()

            cleaned_content = re.sub(
                r'https?://www\.google\.com/url\?q=([^&]+)&[^"]+',
                lambda m: m.group(1),
                content
            )

            f.seek(0)
            f.write(cleaned_content)
            f.truncate()

    class Meta:
        ordering = ['order']
        verbose_name = 'Методичка'
        verbose_name_plural = 'Методички'

    def __str__(self):
        return self.title

    def delete(self, *args, **kwargs):
        """Удаляет всю папку методички при удалении объекта"""
        import shutil

        # Получаем путь к папке методички
        if self.html_file:
            guide_dir = os.path.dirname(self.html_file.path)
        elif self.assets:
            guide_dir = os.path.dirname(self.assets.path)
        else:
            guide_dir = None

        # Сначала вызываем стандартное удаление
        super().delete(*args, **kwargs)

        # Затем удаляем папку (если она существует)
        if guide_dir and os.path.exists(guide_dir):
            try:
                shutil.rmtree(guide_dir)
                print(f"Папка методички удалена: {guide_dir}")
            except Exception as e:
                print(f"Ошибка при удалении папки: {e}")
