from django.db import models


class Course(models.Model):
    title = models.CharField("Название курса", max_length=200)
    cover = models.FileField("Обложка", upload_to="courses/covers/", blank=True)
    description = models.TextField("Описание", blank=True)

    def __str__(self):
        return self.title


class Level(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='levels')
    title = models.CharField("Название уровня", max_length=100)
    description = models.TextField("Описание уровня", blank=True)
    order = models.PositiveIntegerField("Порядок", default=0)

    class Meta:
        ordering = ['order']
        unique_together = [('course', 'title')]  # Чтобы названия не повторялись в рамках курса

    def __str__(self):
        return f"{self.course.title} - {self.title}"


class Guide(models.Model):
    level = models.ForeignKey(Level, on_delete=models.CASCADE, related_name='guides')
    title = models.CharField("Название методички", max_length=200)
    file = models.FileField("Файл", upload_to="guides/")
    order = models.PositiveIntegerField("Порядок", default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title
