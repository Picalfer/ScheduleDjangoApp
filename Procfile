web: gunicorn scheduleApp.wsgi:application --bind 0.0.0.0:$PORT --workers $WEB_CONCURRENCY --timeout 120
release: python manage.py collectstatic --noinput --clear