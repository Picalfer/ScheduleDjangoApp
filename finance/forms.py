from django import forms

from finance.models import FinanceEvent


class FinanceEventForm(forms.ModelForm):
    class Meta:
        model = FinanceEvent
        fields = ['event_type', 'amount']
