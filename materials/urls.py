from django.urls import path

from . import views

urlpatterns = [
    path("", views.hub, name="materials_hub"),
    path('course/<int:course_id>/', views.course_levels, name='course_levels'),

    # HTML-версия
    path('level/<int:level_id>/', views.level_guides, name='level_guides'),

    # API-версии
    path('api/level-guides/<int:level_id>/', views.api_level_guides, name='api_level_guides'),
    path('api/courses-with-levels/', views.courses_with_levels, name='courses-with-levels'),
    path('api/upload-guide/', views.upload_guide, name='upload-guide'),

    # Остальные пути
    path('guide/<int:guide_id>/', views.view_guide, name='view_guide'),
]
