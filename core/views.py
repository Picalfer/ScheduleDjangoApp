from django.http import JsonResponse
from django.shortcuts import render

def index(request):
    return render(request, 'index.html')

def get_data(request):
    response_data = {
        'message': 'Данные с бэкенда!',
    }
    return JsonResponse(response_data)