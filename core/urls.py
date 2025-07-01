from django.contrib.auth import views as auth_views
from django.urls import path

from . import views
from .views import get_open_slots, update_open_slots, weekly_payments, generate_weekly_payments, mark_payment_as_paid, \
    low_balance_clients, low_balance_clients_count, payments_count, StatsDashboardView

urlpatterns = [
    path('', views.home, name='home'),
    path('register/', views.register, name='register'),
    path('login/', views.user_login, name='login'),
    path('logout/', views.user_logout, name='logout'),
    path('profile/', views.profile, name='profile'),
    path('password-change/', auth_views.PasswordChangeView.as_view(), name='password_change'),
    path('password-change/done/', auth_views.PasswordChangeDoneView.as_view(), name='password_change_done'),
    path('get-user-settings/', views.get_user_settings, name='get_user_settings'),
    path('update-user-settings/', views.update_user_settings, name='update_user_settings'),
    path('api/open-slots/<int:teacher_id>/', get_open_slots, name='get_open_slots'),
    path('api/open-slots/<int:teacher_id>/update/', update_open_slots, name='update_open_slots'),
    path('lessons/', views.LessonListCreate.as_view(), name='lessons-list'),
    path('teachers/', views.TeacherListCreate.as_view(), name='teacher-list'),
    path('students/', views.StudentList.as_view(), name='student-list'),
    path('api/create-lesson/', views.create_lesson, name='create-lesson'),
    path('api/complete-lesson/<int:lesson_id>/', views.complete_lesson, name='complete-lesson'),
    path('api/cancel-lesson/<int:lesson_id>/', views.cancel_lesson, name='cancel-lesson'),
    path('generate-payments/', generate_weekly_payments, name='generate-payments'),
    path('payments/', weekly_payments, name='payments'),
    path('api/payments/<int:payment_id>/pay/', mark_payment_as_paid, name='mark_payment_paid'),
    path('api/clients/low-balance/', low_balance_clients, name='low_balance_clients'),
    path('api/clients/low-balance-count/', low_balance_clients_count, name='low_balance_clients_count'),
    path('api/payments-count/', payments_count, name='payments_count'),
    path('stats/', StatsDashboardView.as_view(), name='stats_dashboard'),
]
