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

    try:
        with open(guide.html_file.path, 'r', encoding='utf-8') as f:
            html_content = f.read()
    except UnicodeDecodeError:
        with open(guide.html_file.path, 'r', encoding='cp1251') as f:
            html_content = f.read()

    # Автоматически подставится правильный путь к ассетам
    return render(request, 'materials/guide_wrapper.html', {
        'content': html_content,
        'guide': guide,
        'assets_url': guide.assets_url()
    })