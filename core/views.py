import json
import logging
from datetime import timedelta

from django.db import transaction

from .services.payment_service import calculate_weekly_payments

logger = logging.getLogger(__name__)

from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.shortcuts import render, redirect
from django.utils import timezone
from django.utils.timezone import now
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET
from django.views.decorators.http import require_http_methods
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated

from .forms import ProfileForm
from .forms import RegisterForm, LoginForm
from .models import Lesson, Teacher, Student, TeacherPayment, Client
from .models import OpenSlots, UserSettings
from .serializers import LessonSerializer, TeacherSerializer, StudentSerializer, TeacherPaymentSerializer


@require_POST
@transaction.atomic
def complete_lesson(request, lesson_id):
    try:
        # Основной запрос без select_related для nullable полей
        lesson = Lesson.objects.select_for_update().get(id=lesson_id)

        # Отдельно подгружаем связанные объекты
        lesson.student = Student.objects.get(id=lesson.student_id)
        lesson.teacher = Teacher.objects.get(id=lesson.teacher_id)

        data = json.loads(request.body)

        if not request.user.is_authenticated:
            return JsonResponse({'status': 'error', 'message': 'Требуется авторизация'}, status=401)

        if request.user != lesson.teacher.user and not request.user.is_staff:
            return JsonResponse({'status': 'error', 'message': 'Можно отмечать только свои уроки'}, status=403)

        if lesson.status == 'completed':
            return JsonResponse({'status': 'error', 'message': 'Урок уже проведен'}, status=400)

        if lesson.lesson_type != 'demo':
            try:
                if not lesson.student.spend_lesson():
                    logger.warning(f"Недостаточно средств у студента {lesson.student.id}")
                    return JsonResponse({
                        'status': 'error',
                        'message': f'У клиента {lesson.student.client.name} текущий баланс уроков: {lesson.student.client.balance}',
                        'current_balance': lesson.student.client.balance
                    }, status=402)
            except ValueError as e:
                logger.error(f"Ошибка списания урока: {str(e)}")
                return JsonResponse({
                    'status': 'error',
                    'message': str(e)
                }, status=400)

        lesson.lesson_topic = data.get('lesson_topic') or None
        lesson.lesson_notes = data.get('lesson_notes') or None
        lesson.homework = data.get('homework') or None

        lesson.status = 'completed'
        lesson.completed_at = now()
        lesson.save()

        client = lesson.student.client
        client.refresh_from_db()

        response_data = {
            'status': 'success',
            'message': 'Урок успешно проведен',
            'remaining_balance': client.balance,
            'lesson': {
                'id': lesson.id,
                'date': lesson.date.strftime('%Y-%m-%d'),
                'time': lesson.time.strftime('%H:%M'),
                'topic': lesson.lesson_topic,
                'notes': lesson.lesson_notes,
                'homework': lesson.homework
            }
        }

        # Создаем следующий урок для повторяющихся занятий
        if lesson.lesson_type == 'recurring':
            try:
                next_lesson = lesson.create_next_lesson()
                if next_lesson:
                    response_data['next_lesson'] = {
                        'id': next_lesson.id,
                        'date': next_lesson.date.strftime('%Y-%m-%d'),
                        'time': next_lesson.time.strftime('%H:%M')
                    }
            except Exception as e:
                logger.error(f'Ошибка создания следующего урока: {str(e)}', exc_info=True)

        return JsonResponse(response_data)

    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Неверный JSON'}, status=400)
    except Lesson.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Урок не найден'}, status=404)
    except Exception as e:
        logger.error(f'Ошибка проведения урока: {str(e)}', exc_info=True)
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@require_POST
@transaction.atomic
def cancel_lesson(request, lesson_id):
    try:
        lesson = Lesson.objects.select_related('student', 'teacher__user').select_for_update().get(id=lesson_id)
        data = json.loads(request.body)

        if not request.user.is_authenticated:
            return JsonResponse({'status': 'error', 'message': 'Требуется авторизация'}, status=401)

        if request.user != lesson.teacher.user and not request.user.is_staff:
            return JsonResponse({'status': 'error', 'message': 'Можно отменять только свои уроки'}, status=403)

        if lesson.status != 'scheduled':
            return JsonResponse({'status': 'error', 'message': 'Этот урок нельзя отменить'}, status=400)

        lesson.cancel_reason = data.get('cancel_reason') or None
        lesson.status = 'canceled'
        lesson.canceled_at = now()
        lesson.save()

        response_data = {
            'status': 'success',
            'message': 'Урок успешно отменен',
            'remaining_balance': lesson.student.lesson_balance,
            'lesson': {
                'id': lesson.id,
                'date': lesson.date.strftime('%Y-%m-%d'),
                'time': lesson.time.strftime('%H:%M'),
                'reason': lesson.cancel_reason
            }
        }

        # Создаем следующий урок для повторяющихся занятий
        if lesson.lesson_type == 'recurring':
            next_lesson = lesson.create_next_lesson()
            if next_lesson:
                response_data['next_lesson'] = {
                    'id': next_lesson.id,
                    'date': next_lesson.date.strftime('%Y-%m-%d'),
                    'time': next_lesson.time.strftime('%H:%M')
                }

        return JsonResponse(response_data)

    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Неверный JSON'}, status=400)
    except Lesson.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Урок не найден'}, status=404)
    except Exception as e:
        logger.error(f'Ошибка проведения урока: {str(e)}', exc_info=True)
        return JsonResponse({'status': 'error', 'message': 'Внутренняя ошибка сервера'}, status=500)


class LessonListCreate(generics.ListCreateAPIView):
    # TODO временно отключена пагинация, доработать
    # pagination_class = LessonPagination
    pagination_class = None

    serializer_class = LessonSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['date', 'student', 'status', 'lesson_type']
    search_fields = ['teacher__user__username']

    def get_queryset(self):
        queryset = Lesson.objects.select_related(
            'student', 'student__client',
            'teacher', 'teacher__user'
        )
        # Обрабатываем teacher_id если он есть
        teacher_id = self.request.query_params.get('teacher_id')
        if teacher_id:
            try:
                teacher_id = int(teacher_id)  # Явное преобразование в число
                queryset = queryset.filter(teacher_id=teacher_id)
            except (ValueError, TypeError):
                raise ValidationError("Invalid teacher_id format")

        # Если teacher_id не указан, фильтруем по текущему пользователю
        if not teacher_id:
            queryset = queryset.filter(teacher__user=self.request.user)
        """
        # Фильтрация по датам
        date_after = self.request.query_params.get('date_after')
        date_before = self.request.query_params.get('date_before')
        
        if date_after:
            queryset = queryset.filter(date__gte=date_after)
        if date_before:
            queryset = queryset.filter(date__lte=date_before)"""

        # Фильтрация регулярных уроков
        if self.request.query_params.get('recurring') == 'true':
            today = timezone.now().date()
            queryset = queryset.filter(
                Q(lesson_type='recurring') &
                Q(date__lte=today)
            )

        return queryset.order_by('date', 'time')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        # Добавляем информацию о пользователе в контекст
        context['is_admin'] = self.request.user.is_staff
        return context


class TeacherListCreate(generics.ListCreateAPIView):
    serializer_class = TeacherSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]

    def get_queryset(self):
        return Teacher.objects.select_related('user').all()


class StudentList(generics.ListAPIView):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer


@csrf_exempt
def create_lesson(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)

            # Базовые обязательные поля для всех уроков
            required_fields = ['date', 'time', 'teacher_id', 'student_id', 'subject']
            for field in required_fields:
                if field not in data:
                    return JsonResponse({'error': f'Missing field: {field}'}, status=400)

            lesson_data = {
                'date': data['date'],
                'time': data['time'],
                'teacher_id': data['teacher_id'],
                'student_id': data['student_id'],
                'subject': data['subject'],
                'lesson_type': data.get('lesson_type', 'single'),
                'course': data.get('course', 'Не выбран'),
                'status': 'scheduled'
            }

            # Для регулярных уроков проверяем наличие расписания
            if lesson_data['lesson_type'] == 'recurring':
                if 'schedule' not in data:
                    return JsonResponse(
                        {'error': 'Schedule is required for recurring lessons'},
                        status=400
                    )
                lesson_data['schedule'] = data['schedule']
            else:
                # Для разовых уроков гарантируем отсутствие schedule
                lesson_data['schedule'] = []

            lesson = Lesson.objects.create(**lesson_data)

            return JsonResponse({
                'status': 'success',
                'id': lesson.id,
                'lesson_type': lesson.lesson_type
            })

        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'error': 'Invalid method'}, status=405)


@require_http_methods(["GET"])
def get_open_slots(request, user_id):
    try:
        user = get_object_or_404(User, id=user_id)
        open_slots = get_object_or_404(OpenSlots, teacher=user)
        return JsonResponse({
            "teacher": user.id,
            "weekly_open_slots": open_slots.weekly_open_slots
        })
    except User.DoesNotExist as e:
        return JsonResponse({'error': str(e), 'message': 'Преподаватель не найден'}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["PUT"])
def update_open_slots(request, user_id):
    try:
        user = get_object_or_404(User, id=user_id)
        open_slots = get_object_or_404(OpenSlots, teacher=user)
        data = json.loads(request.body)
        open_slots.weekly_open_slots = data.get("weekly_open_slots", {})
        open_slots.full_clean()  # Валидация данных
        open_slots.save()
        return JsonResponse({
            "teacher": user.id,
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
    context = {
        "user_id": request.user.id,
        "teacher_id": None
    }

    try:
        teacher = Teacher.objects.get(user=request.user)
        context["teacher_id"] = teacher.id
    except Teacher.DoesNotExist:
        pass  # Оставляем teacher_id=None если пользователь не преподаватель

    return render(request, 'core/home.html', context=context)


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


class WeeklyPaymentsList(generics.ListAPIView):
    serializer_class = TeacherPaymentSerializer

    def get_queryset(self):
        today = timezone.now().date()
        last_sunday = today - timedelta(days=today.weekday() + 1)
        last_monday = last_sunday - timedelta(days=6)

        return TeacherPayment.objects.filter(
            week_start_date=last_monday,
            is_paid=False
        ).select_related('teacher')


@require_POST
def generate_weekly_payments(request):
    try:
        calculate_weekly_payments()
        return JsonResponse({'status': 'success', 'message': 'Выплаты сгенерированы'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@require_GET
def weekly_payments(request):
    try:
        calculate_weekly_payments()
        # payments = TeacherPayment.objects.filter(is_paid=False).select_related('teacher')
        payments = TeacherPayment.objects.select_related('teacher')
        data = [{
            'id': p.id,
            'teacher_id': p.teacher.id,
            'user_id': p.teacher.user.id,
            'teacher': p.teacher.user.get_full_name(),
            'week_start': p.week_start_date,
            'week_end': p.week_end_date,
            'lessons': p.lessons_count,
            'amount': float(p.amount),
            'is_paid': p.is_paid,
            'currency': 'RUB'
        } for p in payments]

        return JsonResponse({'status': 'success', 'payments': data})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@require_POST
def mark_payment_as_paid(request, payment_id):
    try:
        payment = TeacherPayment.objects.get(id=payment_id)
        if payment.is_paid:
            return JsonResponse({
                'success': False,
                'message': 'Этот платёж уже был проведён ранее'
            })

        # Помечаем как оплаченный
        payment.is_paid = True
        payment.payment_date = timezone.now()
        payment.save()

        return JsonResponse({
            'success': True,
            'message': 'Платёж успешно подтверждён'
        })

    except TeacherPayment.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Платёж не найден'
        }, status=404)


def low_balance_clients(request):
    clients = Client.objects.filter(balance__lte=2)

    clients_data = []
    for client in clients:
        clients_data.append({
            'id': client.id,
            'name': client.name,
            'balance': client.balance,
            'phone': client.primary_phone.number,
            'phone_note': client.primary_phone.note,
            'children': [
                {
                    'id': student.id,
                    'name': student.name,
                    'teacher': student.teacher.name if student.teacher else None,
                    'notes': student.notes
                }
                for student in client.students.all()
            ]
        })

    return JsonResponse({
        'status': 'success',
        'clients': clients_data
    })


def low_balance_clients_count(request):
    count = Client.objects.filter(balance__lte=2).count()
    return JsonResponse({'count': count})


def payments_count(request):
    count = TeacherPayment.objects.count()
    return JsonResponse({'count': count})
