import json
from venv import logger

from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError, PermissionDenied
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.shortcuts import render, redirect
from django.utils.timezone import now
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.views.decorators.http import require_http_methods
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .forms import ProfileForm
from .forms import RegisterForm, LoginForm
from .models import OpenSlots, UserSettings, LessonLog
from .models import TimeSlot, Teacher, Student
from .serializers import TimeSlotSerializer, TeacherSerializer, StudentSerializer


@require_POST
def complete_lesson(request, lesson_id):
    try:
        lesson = TimeSlot.objects.select_related('student', 'teacher__user').get(id=lesson_id)

        # Проверки
        if not request.user.is_authenticated:
            return JsonResponse({'status': 'error', 'message': 'Требуется авторизация'}, status=401)

        if request.user != lesson.teacher.user:
            return JsonResponse({'status': 'error', 'message': 'Можно отмечать только свои уроки'}, status=403)

        if lesson.status == 'completed':
            return JsonResponse({'status': 'error', 'message': 'Урок уже проведен'}, status=400)

        # Фиксируем начальный баланс
        old_balance = lesson.student.lesson_balance

        # Проверяем и списываем урок
        if not lesson.student.spend_lesson():
            return JsonResponse({
                'status': 'error',
                'message': f'У студента {lesson.student.name} нулевой баланс уроков'
            }, status=402)

        # Создаем запись в логе
        LessonLog.objects.create(
            lesson=lesson,
            teacher=request.user,
            student=lesson.student,
            action='completed',
            old_balance=old_balance,
            new_balance=lesson.student.lesson_balance,
            notes=f'Урок по {lesson.subject} отмечен как проведенный'
        )

        # Обновляем статус урока
        lesson.status = 'completed'
        lesson.completed_at = now()  # Добавьте это поле в модель TimeSlot
        lesson.save()

        return JsonResponse({
            'status': 'success',
            'message': 'Урок успешно проведен',
            'remaining_balance': lesson.student.lesson_balance,
            'log_id': LessonLog.objects.latest('id').id  # ID созданной записи
        })

    except Exception as e:
        logger.error(f'Ошибка проведения урока: {str(e)}', exc_info=True)
        return JsonResponse({'status': 'error', 'message': 'Внутренняя ошибка сервера'}, status=500)


class TimeSlotListCreate(generics.ListCreateAPIView):
    serializer_class = TimeSlotSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['date', 'student', 'status']

    def get_queryset(self):
        # Получаем teacher_id из параметров запроса
        teacher_id = self.request.query_params.get('teacher_id')

        # Если teacher_id не указан - используем текущего пользователя
        if not teacher_id:
            return TimeSlot.objects.filter(teacher__user=self.request.user)

        # Проверяем права (только админ может смотреть чужие расписания)
        if not self.request.user.is_staff:
            raise PermissionDenied("Только администраторы могут просматривать чужие расписания")

        return TimeSlot.objects.filter(teacher_id=teacher_id)


class TimeSlotRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    queryset = TimeSlot.objects.all()
    serializer_class = TimeSlotSerializer


class TeacherList(generics.ListAPIView):
    queryset = Teacher.objects.all()
    serializer_class = TeacherSerializer


class StudentList(generics.ListAPIView):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer


@csrf_exempt
def create_lesson(request):
    if request.method == 'POST':
        try:
            print("Raw request body:", request.body)  # Логируем сырые данные
            data = json.loads(request.body)
            print("Parsed data:", data)  # Логируем распарсенные данные

            # Проверка обязательных полей
            required_fields = ['date', 'time', 'teacher_id', 'student_id', 'subject']
            for field in required_fields:
                if field not in data:
                    return JsonResponse({'error': f'Missing field: {field}'}, status=400)

            # Создаем урок
            lesson = TimeSlot.objects.create(
                date=data['date'],
                time=data['time'],
                teacher_id=data['teacher_id'],
                student_id=data['student_id'],
                subject=data['subject'],
                is_recurring=data.get('is_recurring', False)
            )
            return JsonResponse({'status': 'success', 'id': lesson.id})
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'error': 'Invalid method'}, status=405)


@require_http_methods(["GET"])
def get_open_slots(request, teacher_id):
    try:
        teacher = get_object_or_404(User, id=teacher_id)
        open_slots = get_object_or_404(OpenSlots, teacher=teacher)
        return JsonResponse({
            "teacher": teacher.id,
            "weekly_open_slots": open_slots.weekly_open_slots
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["PUT"])
def update_open_slots(request, teacher_id):
    try:
        teacher = get_object_or_404(User, id=teacher_id)
        open_slots = get_object_or_404(OpenSlots, teacher=teacher)
        data = json.loads(request.body)
        open_slots.weekly_open_slots = data.get("weekly_open_slots", {})
        open_slots.full_clean()  # Валидация данных
        open_slots.save()
        return JsonResponse({
            "teacher": teacher.id,
            "weekly_open_slots": open_slots.weekly_open_slots
        })
    except ValidationError as e:
        return JsonResponse({"error": str(e)}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@login_required
def get_user_settings(request):
    settings, created = UserSettings.objects.get_or_create(user=request.user)
    return JsonResponse({
        'theme': settings.theme,
        'workingHours': {
            'start': settings.working_hours_start,
            'end': settings.working_hours_end,
        }
    })


@login_required
def update_user_settings(request):
    if request.method == 'POST':
        settings, created = UserSettings.objects.get_or_create(user=request.user)

        # Обновляем тему, если она передана
        if 'theme' in request.POST:
            settings.theme = request.POST['theme']

        # Обновляем рабочие часы, если они переданы
        if 'working_hours_start' in request.POST:
            settings.working_hours_start = int(request.POST['working_hours_start'])
        if 'working_hours_end' in request.POST:
            settings.working_hours_end = int(request.POST['working_hours_end'])

        settings.save()
        return JsonResponse({'status': 'success'})

    return JsonResponse({'status': 'error', 'message': 'Недопустимый метод запроса'}, status=400)


def register(request):
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('home')
    else:
        form = RegisterForm()
    return render(request, 'registration/register.html', {'form': form})


def user_login(request):
    if request.method == 'POST':
        form = LoginForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(username=username, password=password)
            if user is not None:
                login(request, user)
                return redirect('home')  # Перенаправляем на главную страницу
    else:
        form = LoginForm()
    return render(request, 'registration/login.html', {'form': form})


def user_logout(request):
    logout(request)
    return redirect('home')  # Перенаправляем на главную страницу


@login_required
def home(request):
    return render(request, 'core/home.html', context={"current_user_id": request.user.id})


@login_required
def profile(request):
    user = request.user
    if request.method == 'POST':
        form = ProfileForm(request.POST, instance=user)
        if form.is_valid():
            form.save()
            return redirect('profile')  # Перенаправляем обратно на страницу профиля
    else:
        form = ProfileForm(instance=user)
    return render(request, 'core/profile.html', {'form': form})
