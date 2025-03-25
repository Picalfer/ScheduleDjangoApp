import json

from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.shortcuts import render, redirect
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics

from .forms import ProfileForm
from .forms import RegisterForm, LoginForm
from .models import OpenSlots, UserSettings
from .models import TimeSlot, Teacher, Student
from .serializers import TimeSlotSerializer, TeacherSerializer, StudentSerializer


class TimeSlotListCreate(generics.ListCreateAPIView):
    queryset = TimeSlot.objects.all()
    serializer_class = TimeSlotSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['date', 'teacher', 'student', 'status']


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
