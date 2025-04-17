from django.db import models


class Course(models.Model):
    title = models.CharField("Название курса", max_length=100)
    short_description = models.TextField("Краткое описание", max_length=200)
    cover = models.ImageField("Обложка", upload_to="courses/covers/", blank=True)
    slug = models.SlugField("URL-адрес", unique=True)  # Для красивых URL
    order = models.PositiveIntegerField("Порядок", default=0)  # Для сортировки

    class Meta:
        ordering = ["order"]  # Сортировка по умолчанию

    def __str__(self):
        return self.title
