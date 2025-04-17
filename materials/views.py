from django.shortcuts import render

from .models import Course


def hub(request):
    courses = Course.objects.all()
    return render(request, "materials/hub.html", {"courses": courses})
