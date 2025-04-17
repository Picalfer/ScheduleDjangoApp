from django.urls import path

from . import views
from .views import course_levels

urlpatterns = [
    path("", views.hub, name="materials_hub"),
    path('course/<int:course_id>/', course_levels, name='course_levels'),
    path('level/<int:level_id>/', views.level_guides, name='level_guides'),
    path('guide/<int:guide_id>/', views.view_guide, name='view_guide'),
]
