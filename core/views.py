import json
import logging

from django.db import transaction

from .constants import EXCLUDED_TEACHERS_IDS
from .services.payment_service import calculate_weekly_payments

logger = logging.getLogger(__name__)

from django.views.generic import TemplateView
from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from datetime import timedelta
from .models import Client, Teacher, Lesson, BalanceOperation, TeacherPayment

from django.db.models import Exists, OuterRef
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db.models import Prefetch
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.shortcuts import render, redirect
from django.utils.timezone import now
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET
from django.views.decorators.http import require_http_methods
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated

from .forms import ProfileForm
from .forms import RegisterForm, LoginForm
from .models import Student
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
        # Если teacher_id есть, присылаем его уроки
        teacher_id = self.request.query_params.get('teacher_id')
        if teacher_id:
            try:
                teacher_id = int(teacher_id)
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
    if request.method == 'POST':
        form = ProfileForm(request.POST, instance=request.user)
        if form.is_valid():
            user = form.save()

            # Обновляем ссылки преподавателя
            if hasattr(user, 'teacher'):
                user.teacher.zoom_link = request.POST.get('zoom_link', '').strip() or None
                user.teacher.google_meet_link = request.POST.get('google_meet_link', '').strip() or None
                user.teacher.save()

            return redirect('profile')
    else:
        form = ProfileForm(instance=request.user)

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
        # calculate_weekly_payments()
        payments = TeacherPayment.objects.filter(is_paid=False).select_related('teacher')
        # payments = TeacherPayment.objects.select_related('teacher')
        data = [{
            'id': p.id,
            'created_at': p.local_created_at,
            'due_date': p.due_date,
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


def payments_count(request):
    count = TeacherPayment.objects.filter(is_paid=False).count()
    return JsonResponse({'count': count})


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


def get_filtered_low_balance_clients_queryset():
    """Возвращает клиентов с балансом <= 2, у которых есть дети у преподавателей школы."""
    return Client.objects.filter(balance__lte=2).annotate(
        has_valid_student=Exists(
            Student.objects.filter(
                client_id=OuterRef('id'),
                teacher__user__isnull=False
            ).exclude(teacher__user__id__in=EXCLUDED_TEACHERS_IDS)
        )
    ).filter(has_valid_student=True)


def low_balance_clients(request):
    try:
        clients = get_filtered_low_balance_clients_queryset().prefetch_related(
            'phone_numbers',
            Prefetch(
                'students',
                queryset=Student.objects.select_related('teacher__user').order_by('id')
            )
        )

        clients_data = []
        for client in clients:
            primary_phone = client.primary_phone
            children_data = []

            for student in client.students.all():
                teacher = student.teacher
                teacher_name = (
                    f"{teacher.user.first_name} {teacher.user.last_name}"
                    if teacher and teacher.user else None
                )

                children_data.append({
                    'id': student.id,
                    'name': student.name,
                    'teacher': teacher_name,
                    'is_excluded_teacher': teacher and teacher.user.id in EXCLUDED_TEACHERS_IDS,
                    'notes': student.notes
                })

            clients_data.append({
                'id': client.id,
                'name': client.name,
                'balance': client.balance,
                'phone': primary_phone.number if primary_phone else None,
                'phone_note': primary_phone.note if primary_phone else None,
                'children': children_data
            })

        return JsonResponse({'status': 'success', 'clients': clients_data})

    except Exception as e:
        logger.error(f"Error in low_balance_clients: {str(e)}", exc_info=True)
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


def low_balance_clients_count(request):
    try:
        count = get_filtered_low_balance_clients_queryset().count()
        return JsonResponse({'count': count})
    except Exception as e:
        logger.error(f"Error in low_balance_clients_count: {str(e)}", exc_info=True)
        return JsonResponse({'count': 0, 'error': str(e)}, status=500)


class StatsDashboardView(TemplateView):
    template_name = 'core/stats.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # 1. Клиентская статистика
        context['client_stats'] = {
            'total': Client.objects.count(),
            'with_negative': Client.objects.filter(balance__lt=0).count(),
            'low_balance': Client.objects.filter(balance__lte=2).count(),
            'avg_balance': Client.objects.aggregate(avg=Avg('balance'))['avg'] or 0,
        }

        # 2. Статистика преподавателей
        context['teacher_stats'] = {
            'total': Teacher.objects.count(),
            'active': Teacher.objects.annotate(
                lesson_count=Count('lesson')
            ).filter(lesson_count__gt=0).count(),
            'unpaid_amount': TeacherPayment.objects.filter(
                is_paid=False
            ).aggregate(total=Sum('amount'))['total'] or 0
        }

        # 3. Статистика уроков
        total_lessons = Lesson.objects.count()
        context['lesson_stats'] = {
            'total': total_lessons,
            'completed': Lesson.objects.filter(status='completed').count(),
            'canceled': Lesson.objects.filter(status='canceled').count(),
            'cancel_rate': round(
                Lesson.objects.filter(status='canceled').count() / total_lessons * 100,
                2
            ) if total_lessons > 0 else 0,
            'by_platform': list(Lesson.objects.values('platform').annotate(
                count=Count('id')
            )),
            'today': Lesson.objects.filter(date=timezone.now().date()).count()
        }

        # 4. Финансовая аналитика
        context['finance_stats'] = {
            'monthly_income': BalanceOperation.objects.filter(
                operation_type='add',
                date__month=timezone.now().month
            ).aggregate(total=Sum('amount'))['total'] or 0,
            'teacher_payments': TeacherPayment.objects.aggregate(
                total=Sum('amount')
            )['total'] or 0
        }

        last_month = timezone.now() - timedelta(days=30)
        two_months_ago = timezone.now() - timedelta(days=60)

        # 5. Топ-5 преподавателей
        context['top_teachers'] = Teacher.objects.annotate(
            lesson_count=Count('lesson'),
            student_count=Count('student')
        ).order_by('-lesson_count')[:5]

        # 6. Последние операции
        context['recent_operations'] = BalanceOperation.objects.select_related(
            'client', 'student'
        ).order_by('-date')[:10]

        workload_stats = calculate_workload_stats()
        # В основном методе get_context_data добавляем:
        context.update(workload_stats)

        # Статистика преподавателей
        teacher_count_month_ago = Teacher.objects.filter(
            user__date_joined__lt=last_month,
            user__date_joined__gte=two_months_ago
        ).count()

        teacher_count_this_month = Teacher.objects.filter(
            user__date_joined__gte=last_month
        ).count()

        total_teachers = Teacher.objects.count()
        active_teachers = Teacher.objects.annotate(
            lesson_count=Count('lesson')
        ).filter(lesson_count__gt=0).count()

        context['teacher_stats'] = {
            'total': total_teachers,
            'new_this_month': teacher_count_this_month,
            'growth_rate': round(
                (teacher_count_this_month - teacher_count_month_ago) /
                (teacher_count_month_ago or 1) * 100
            ),
            'growth_trend': 'positive' if teacher_count_this_month >= teacher_count_month_ago else 'negative',
            'active': active_teachers,
            'active_percent': round(active_teachers / total_teachers * 100) if total_teachers > 0 else 0,
            'avg_workload': workload_stats['school_workload']  # Функция из предыдущего примера
        }

        return context


# Добавляем в get_context_data в StatsDashboardView

def calculate_workload_stats():
    teachers = Teacher.objects.all()
    workload_data = []
    total_slots = 0
    total_lessons = 0

    for teacher in teachers:
        try:
            open_slots = OpenSlots.objects.get(teacher=teacher.user).weekly_open_slots
            # Считаем количество доступных слотов
            available_slots = sum(len(slots) for day, slots in open_slots.items() if slots)

            # Считаем запланированные уроки
            scheduled_lessons = Lesson.objects.filter(
                teacher=teacher,
                status='scheduled',
                date__gte=timezone.now().date(),
                date__lte=timezone.now().date() + timedelta(days=7)
            ).count()

            # Расчет нагрузки
            workload_percent = min(100,
                                   round((scheduled_lessons / available_slots * 100)) if available_slots > 0 else 0)

            workload_data.append({
                'teacher': teacher.name,
                'available_slots': available_slots,
                'scheduled_lessons': scheduled_lessons,
                'workload_percent': workload_percent,
                'status': get_workload_status(workload_percent)
            })

            total_slots += available_slots
            total_lessons += scheduled_lessons

        except OpenSlots.DoesNotExist:
            continue

    # Общая нагрузка школы
    school_workload = min(100, round((total_lessons / total_slots * 100)) if total_slots > 0 else 0)

    # Рекомендации
    recommendation = "Оптимальная нагрузка"
    if school_workload > 85:
        recommendation = "❗ Высокая нагрузка - требуется поиск новых преподавателей"
    elif school_workload < 30:
        recommendation = "⚠️ Низкая загрузка - можно набирать больше клиентов"

    return {
        'teachers_workload': sorted(workload_data, key=lambda x: x['workload_percent'], reverse=True),
        'school_workload': school_workload,
        'recommendation': recommendation
    }


def get_workload_status(percent):
    if percent > 80:
        return "danger"
    elif percent > 60:
        return "warning"
    return "success"
