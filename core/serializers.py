from rest_framework import serializers

from .models import OpenSlots
from .models import TimeSlot, Teacher, Student


class TimeSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeSlot
        fields = '__all__'


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
