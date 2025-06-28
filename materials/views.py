from django.shortcuts import get_object_or_404, render
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from transliterate import translit

from materials.models import Guide, Level
from .models import Course


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


class GuideUploadAPI(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Получаем данные из запроса
        level_id = request.data.get('level_id')
        title = request.data.get('title')
        html_file = request.FILES.get('html_file')
        assets_zip = request.FILES.get('assets_zip')
        order = request.data.get('order', 0)

        from rest_framework.exceptions import ValidationError

        if not level_id:
            raise ValidationError('level_id is required')

        try:
            level = Level.objects.get(pk=level_id)

            # Создаём методичку
            guide = Guide.objects.create(
                level=level,
                title=title,
                order=order
            )

            # Сохраняем файлы
            if html_file:
                try:
                    transliterated = translit(html_file.name, 'ru', reversed=True)
                except:
                    transliterated = html_file.name

                guide.html_file.save(transliterated, html_file)

            if assets_zip:
                guide.assets.save(assets_zip.name, assets_zip)

            return Response({
                'status': 'success',
                'guide_id': guide.id,
                'html_path': guide.html_file.url if guide.html_file else None,
                'assets_path': guide.assets.url if guide.assets else None
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            print(e)
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
