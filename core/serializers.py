from rest_framework import serializers
from .models import OpenSlots

class OpenSlotsSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpenSlots
        fields = ['teacher', 'weekly_open_slots']