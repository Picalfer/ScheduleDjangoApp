import os
import zipfile

from django.conf import settings
from django.shortcuts import get_object_or_404, render

from .models import Course, Level, Guide


def hub(request):
    courses = Course.objects.all()
    return render(request, "materials/hub.html", {"courses": courses})


def course_levels(request, course_id):
    course = get_object_or_404(Course, id=course_id)
    levels = course.levels.all()

    return render(request, 'materials/course_levels.html', {
        'course': course,
        'levels': levels
    })


def level_guides(request, level_id):
    level = get_object_or_404(Level, id=level_id)
    guides = level.guides.all().order_by('order')

    return render(request, 'materials/level_guides.html', {
        'level': level,
        'guides': guides,
        'course': level.course  # Передаем курс для навигации
    })


def view_guide(request, guide_id):
    guide = get_object_or_404(Guide, id=guide_id)

    # Распаковываем архив при первом обращении
    if guide.assets and not os.path.exists(os.path.join(settings.MEDIA_ROOT, 'guides/assets', str(guide.id))):
        with zipfile.ZipFile(guide.assets.path, 'r') as zip_ref:
            zip_ref.extractall(os.path.join(settings.MEDIA_ROOT, 'guides/assets', str(guide.id)))

    # Читаем HTML и заменяем пути
    with guide.html_file.open('r') as f:
        html_content = f.read()

    # Заменяем пути к ресурсам
    html_content = html_content.replace('images/', f'/media/guides/assets/{guide.id}/images/') \
        .replace('style.css', f'/static/materials/css/guide_styles.css')

    return render(request, 'materials/guide_wrapper.html', {
        'content': html_content,
        'guide': guide
    })
