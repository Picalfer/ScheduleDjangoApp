from django.contrib.auth import views as auth_views
from django.urls import path

from . import views
from .views import get_open_slots, update_open_slots, test_weekly_payments

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
    path('test-payments/', test_weekly_payments, name='test-payments'),
]
