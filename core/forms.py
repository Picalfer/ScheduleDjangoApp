from django import forms
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.models import User

from core.models import Lesson, FinanceEvent
from core.widgets import ScheduleWidget


class LoginForm(AuthenticationForm):
    username = forms.CharField(
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'autocomplete': 'username',
            'placeholder': 'Введите ваш логин'
        }),
        label="Логин"
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'autocomplete': 'current-password',
            'placeholder': 'Введите ваш пароль'
        }),
        label="Пароль"
    )


class ProfileForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email']


class LessonAdminForm(forms.ModelForm):
    class Meta:
        model = Lesson
        fields = '__all__'
        widgets = {
            'schedule': ScheduleWidget(),
        }


class FinanceEventForm(forms.ModelForm):
    class Meta:
        model = FinanceEvent
        fields = ['event_type', 'amount']
