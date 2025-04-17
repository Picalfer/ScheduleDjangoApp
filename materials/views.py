from django.shortcuts import get_object_or_404
from django.shortcuts import render

from .models import Course, Level


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
