export class LessonManager {
    constructor() {
        this.lessons = [];
        this.displayedLessons = new Set();
    }

    generateFutureLessons(lesson, endDate) {
        const generatedLessons = [];
        const startDate = new Date(lesson.date);

        lesson.schedule.forEach(scheduleDay => {
            let currentDate = new Date(startDate);

            while (currentDate <= endDate) {
                // Пропускаем оригинальную дату урока
                if (currentDate.toDateString() === startDate.toDateString()) {
                    currentDate.setDate(currentDate.getDate() + 7);
                    continue;
                }

                const fakeLesson = {
                    ...lesson,
                    id: `fake_${lesson.id}_${currentDate.toISOString()}`,
                    date: currentDate.toISOString().split('T')[0],
                    is_future: true,
                    is_reliable: false,
                    original_lesson_id: lesson.id
                };

                generatedLessons.push(fakeLesson);
                currentDate.setDate(currentDate.getDate() + 7);
            }
        });

        return generatedLessons;
    }

    createLessonHTML(lesson, isMultiple = false, index = 0, total = 1) {
        const lessonTypeClass = {
            'recurring': 'permanent',
            'demo': 'demo',
            'single': 'one-time'
        }[lesson.lesson_type];

        const statusClass = {
            'completed': 'completed',
            'canceled': 'cancelled',
            'scheduled': 'scheduled'
        }[lesson.status];

        const lessonIcon = {
            'recurring': '🔄',
            'demo': '🎯',
            'single': '1️⃣'
        }[lesson.lesson_type];

        const typeLabel = {
            'recurring': 'Постоянный',
            'demo': 'Вводный',
            'single': 'Разовый'
        }[lesson.lesson_type];

        const isFuture = lesson.is_future;
        const clickHandler = isFuture
            ? 'event.preventDefault(); window.showNotification(\'Это запланированный урок\', \'info\')'
            : `window.openLessonModal(${JSON.stringify(lesson).replace(/"/g, '&quot;')})`;

        const isUnreliable = !lesson.is_reliable && !isFuture && statusClass === 'scheduled';

        // Базовые классы
        let classes = `lesson ${lessonTypeClass} ${statusClass}`;
        if (isFuture) classes += ' future';
        if (isUnreliable) classes += ' unreliable';
        if (isMultiple) classes += ' multiple';

        // Стили для множественного отображения
        const multipleStyles = isMultiple ?
            `style="z-index: ${total - index}; overflow: hidden;"` :
            '';

        return `
        <div class="${classes}" 
             data-lesson-id="${lesson.id}"
             data-status="${lesson.status || 'scheduled'}"
             onclick="${clickHandler}"
             ${multipleStyles}>
            
            ${lesson.balance !== undefined ? `
                <div class="balance-badge" 
                     data-balance="${lesson.balance < 0 ? '-' : lesson.balance}"
                     title="${lesson.balance < 0 ? 'Отрицательный баланс' : 'Остаток уроков'}">
                    ${lesson.balance}
                </div>
            ` : ''}
            
            ${isUnreliable ? '<div class="unreliable-badge" title="Ненадёжный урок \nУрок может быть отменен">⚠️</div>' : ''}
            
            ${isMultiple ? `
                <div class="multiple-lesson-content">
                    <span class="lesson-icon">${lessonIcon}</span>
                    <span class="student-name">${lesson.student_name}</span>
                    ${index === 0 && total > 1 ? `
                        <span class="lesson-count">+${total - 1}</span>
                    ` : ''}
                </div>
            ` : `
                <h4>${lessonIcon} ${typeLabel} урок</h4>
                <p>👩‍🎓 ${lesson.student_name}</p>
                <p>📚 ${lesson.course}</p>
            `}
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