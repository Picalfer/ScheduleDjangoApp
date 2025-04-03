export class LessonManager {
    constructor() {
        this.lessons = [];
        this.displayedLessons = new Set();
    }

    generateFutureLessons(lesson, endDate) {
        const weekdayMapping = {
            'monday': 1, 'tuesday': 2, 'wednesday': 3,
            'thursday': 4, 'friday': 5, 'saturday': 6, 'sunday': 0
        };

        const fakeLessons = [];
        const originalDate = new Date(lesson.date + 'T' + lesson.time);
        originalDate.setSeconds(0, 0);

        function formatTime(date) {
            return date.toTimeString().slice(0, 8);
        }

        lesson.schedule.forEach(scheduleItem => {
            const targetWeekday = weekdayMapping[scheduleItem.day.toLowerCase()];
            const [hours, minutes] = scheduleItem.time.split(':').map(Number);

            let currentDate = new Date(originalDate);
            currentDate.setDate(currentDate.getDate() + 1);

            while (currentDate <= endDate) {
                if (currentDate.getDay() === targetWeekday) {
                    const lessonDate = new Date(currentDate);
                    lessonDate.setHours(hours, minutes, 0, 0);

                    if (lessonDate > originalDate) {
                        fakeLessons.push({
                            ...lesson,
                            id: `fake_${lesson.id}_${lessonDate.getTime()}`,
                            date: lessonDate.toISOString().split('T')[0],
                            time: formatTime(lessonDate),
                            is_future: true,
                            original_lesson_id: lesson.id
                        });
                    }
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
        });

        return fakeLessons;
    }

    createLessonHTML(lesson) {
        const isRecurring = lesson.lesson_type === 'recurring';
        const isCompleted = lesson.status === 'completed';
        const isCanceled = lesson.status === 'canceled';
        const isFuture = lesson.is_future;

        return `
                    <div class="lesson ${isRecurring ? 'permanent' : 'one-time'} ${isCanceled ? 'cancelled' : ''} ${isCompleted ? 'completed' : ''} ${isFuture ? 'future' : ''}" 
                         data-lesson-id="${lesson.id}"
                         data-status="${lesson.status || 'scheduled'}"
                         onclick="${isFuture ? 'event.preventDefault(); window.showNotification(\'Это запланированный урок\', \'info\')' : `window.openLessonModal(${JSON.stringify(lesson).replace(/"/g, '&quot;')})`}">
                        <h4>${isRecurring ? '🔄 Постоянный' : '1️⃣ Разовый'} урок</h4>
                        <p>👩‍🎓 ${lesson.student_name}</p>
                        <p>📚 ${lesson.course}</p>
                    </div>
                `;
    }

    clearAllLessons() {
        this.displayedLessons.clear();
        document.querySelectorAll('.week-day .hour').forEach(hourElement => {
            hourElement.innerHTML = '';
            hourElement.classList.remove('has-lesson');
        });
    }

    getLessonsForDay(dayDate) {
        const dateStr = dayDate.toISOString().split('T')[0];
        return this.lessons.filter(lesson => lesson.date === dateStr);
    }
}