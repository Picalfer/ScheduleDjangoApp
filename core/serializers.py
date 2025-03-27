from rest_framework import serializers

from .models import OpenSlots
from .models import Lesson, Teacher, Student


class TimeSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = '__all__'
        extra_kwargs = {
            'start_date': {'required': False},
            'lesson_topic': {'required': False},
            'lesson_notes': {'required': False},
            'homework': {'required': False},
            'completed_at': {'required': False},
        }


class TeacherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Teacher
        fields = '__all__'


class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = '__all__'


class OpenSlotsSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpenSlots
        fields = ['teacher', 'weekly_open_slots']
