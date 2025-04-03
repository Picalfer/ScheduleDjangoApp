from datetime import timedelta

from rest_framework import serializers

from .models import Lesson, Teacher, Student, TeacherPayment
from .models import OpenSlots


class LessonSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    start_date = serializers.DateField(source='date', read_only=True)

    class Meta:
        model = Lesson
        fields = '__all__'
        extra_kwargs = {
            'lesson_topic': {'required': False},
            'lesson_notes': {'required': False},
            'homework': {'required': False},
            'completed_at': {'required': False},
            'date': {'required': True},
            'time': {'required': False},
            'schedule': {'required': False},
        }


class TeacherSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)  # если нужно email

    class Meta:
        model = Teacher
        fields = ['id', 'user', 'name', 'user_email']
        extra_kwargs = {
            'user': {'read_only': True}  # если user не должен изменяться через этот API
        }


class StudentSerializer(serializers.ModelSerializer):
    lesson_balance = serializers.IntegerField(source='client.balance', read_only=True)

    class Meta:
        model = Student
        fields = '__all__'


class OpenSlotsSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpenSlots
        fields = ['teacher', 'weekly_open_slots']


class TeacherPaymentSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.user.get_full_name', read_only=True)
    week_range = serializers.SerializerMethodField()

    class Meta:
        model = TeacherPayment
        fields = ['id', 'teacher', 'teacher_name', 'week_start_date',
                  'week_range', 'lessons_count', 'amount', 'is_paid']

    def get_week_range(self, obj):
        return f"{obj.week_start_date} - {obj.week_start_date + timedelta(days=6)}"
