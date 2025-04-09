web: gunicorn scheduleApp.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120
release: python manage.py collectstatic --noinput --clear