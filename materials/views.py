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


from django.views.decorators.http import require_GET

from materials.models import Course


@require_GET
def courses_with_levels(request):
    data = []
    for course in Course.objects.prefetch_related('levels').all():
        data.append({
            'course_id': course.id,
            'course_title': course.title,
            'levels': [
                {
                    'level_id': level.id,
                    'level_title': level.title,
                    'level_description': level.description,
                    'order': level.order
                } for level in course.levels.all()
            ]
        })
    return JsonResponse({'courses': data}, safe=False)


# Для API (возвращает JSON)
@require_GET
def api_level_guides(request, level_id):
    try:
        level = Level.objects.get(pk=level_id)
        guides = level.guides.all().order_by('order')
        data = {
            'level_title': level.title,
            'guides': [
                {
                    'id': guide.id,
                    'title': guide.title,
                    'order': guide.order
                } for guide in guides
            ]
        }
        return JsonResponse(data)
    except Level.DoesNotExist:
        return JsonResponse({'error': 'Level not found'}, status=404)


# Для HTML-отображения
def level_guides(request, level_id):
    level = get_object_or_404(Level, id=level_id)
    guides = level.guides.all().order_by('order')

    return render(request, 'materials/level_guides.html', {
        'level': level,
        'guides': guides,
        'course': level.course
    })


from django.shortcuts import get_object_or_404, render

from django.contrib.auth import authenticate
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from materials.models import Level, Guide
from transliterate import translit
import base64


@csrf_exempt  # Отключаем CSRF (иначе будет 403)
@require_POST
def upload_guide(request):
    # --- Авторизация ---
    auth_header = request.META.get('HTTP_AUTHORIZATION')

    if not auth_header or not auth_header.startswith('Basic '):
        return JsonResponse({'error': 'Authentication required'}, status=403)

    try:
        encoded = auth_header.split(' ')[1]
        decoded = base64.b64decode(encoded).decode('utf-8')
        username, password = decoded.split(':', 1)
    except Exception as e:
        return JsonResponse({'error': 'Invalid authentication format'}, status=403)

    user = authenticate(username=username, password=password)

    if not user:
        return JsonResponse({'error': 'Invalid credentials'}, status=403)

    # --- Данные запроса ---
    level_id = request.POST.get('level_id')
    title = request.POST.get('title')
    html_file = request.FILES.get('html_file')
    assets_zip = request.FILES.get('assets_zip')
    order = request.POST.get('order', 0)

    if not level_id:
        return JsonResponse({'error': 'level_id is required'}, status=400)

    try:
        level = Level.objects.get(pk=level_id)

        guide = Guide.objects.create(
            level=level,
            title=title,
            order=order
        )

        if html_file:
            try:
                transliterated = translit(html_file.name, 'ru', reversed=True)
            except:
                transliterated = html_file.name

            guide.html_file.save(transliterated, html_file)

        if assets_zip:
            guide.assets.save(assets_zip.name, assets_zip)

        return JsonResponse({
            'status': 'success',
            'guide_id': guide.id,
            'html_path': guide.html_file.url if guide.html_file else None,
            'assets_path': guide.assets.url if guide.assets else None
        }, status=201)

    except Exception as e:
        print("Ошибка загрузки методички:", e)
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
