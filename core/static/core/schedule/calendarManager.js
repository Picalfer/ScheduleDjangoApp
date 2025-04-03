import * as repository from './repository.js';
import {DAYS_OF_WEEK, showNotification} from "./utils.js";
import {settingsManager} from "../home.js";
import {WeekManager} from "./weekManager.js";
import {LessonManager} from "./lessonManager.js";

export class CalendarManager {

    constructor() {
        this.lessonManager = new LessonManager();
        this.weekManager = new WeekManager();
        this.openSlots = {};
        this.startHour = 6;
        this.endHour = 18;

        this.loadSchedule();
        this.updateCalendarUi()
        this.goToCurrentWeek();
        this.setupEventListeners()
    }

    setupEventListeners() {
        document.getElementById('prev-week').addEventListener('click', () => {
            if (settingsManager.isOpenWindowsMode) {
                showNotification("Недоступно в режиме выбора открытых окон", "error");
            } else {
                this.prevWeek();
            }
        });

        document.getElementById('next-week').addEventListener('click', () => {
            if (settingsManager.isOpenWindowsMode) {
                showNotification("Недоступно в режиме выбора открытых окон", "error");
            } else {
                this.nextWeek();
            }
        });

        document.getElementById('current-week').addEventListener('click', () => {
            if (settingsManager.isOpenWindowsMode) {
                showNotification("Недоступно в режиме выбора открытых окон", "error");
            } else {
                this.goToCurrentWeek();
            }
        });
    }

    clearSchedule() {
        document.querySelectorAll('.week-day .hour').forEach(hour => {
            if (!hour.querySelector('.lesson')) {
                hour.className = 'hour';
                hour.innerHTML = '';
            }
        });
    }

    generateTimeSlots() {
        const timeColumn = document.querySelector('.time-column');
        const weekDays = document.querySelectorAll('.week-day');

        // Очищаем существующие слоты
        timeColumn.innerHTML = '';
        weekDays.forEach(day => day.innerHTML = '');

        // Генерируем слоты для каждого часа в диапазоне
        Array.from({length: this.endHour - this.startHour + 1}, (_, i) => this.startHour + i)
            .forEach(hour => {
                const formattedHour = `${String(hour).padStart(2, '0')}:00`;

                // Добавляем метку времени в колонку
                timeColumn.insertAdjacentHTML('beforeend',
                    `<div class="time"><p>${formattedHour}</p></div>`);

                // Добавляем ячейки для каждого дня недели
                weekDays.forEach((day, dayIndex) => {
                    day.insertAdjacentHTML('beforeend', `
                    <div class="hour" 
                         data-day="${DAYS_OF_WEEK[dayIndex]}" 
                         data-hour="${formattedHour}">
                    </div>
                `);
                });
            });
    }

    displayOpenSlots() {
        if (!this.openSlots) {
            console.warn("openSlots не загружены");
            return;
        }

        // Сначала убираем все открытые окна
        document.querySelectorAll('.open-window').forEach(el => {
            el.classList.remove('open-window');
        });

        // Добавляем актуальные открытые окна
        DAYS_OF_WEEK.forEach(day => {
            const dayElement = document.getElementById(day);
            if (!dayElement) {
                console.error("Элемент дня не найден:", day);
                return;
            }

            const slots = this.openSlots[day] || [];
            slots.forEach(time => {
                const hour = parseInt(time.split(':')[0]);
                if (hour >= this.startHour && hour <= this.endHour) {
                    const hourIndex = hour - this.startHour;
                    const hourElement = dayElement.children[hourIndex];
                    if (hourElement) {
                        hourElement.classList.add('open-window');
                    }
                }
            });
        });
    }

    displayLessons() {
        if (!Array.isArray(this.lessonManager.lessons)) {
            console.warn("Некорректные данные уроков");
            return;
        }

        const currentWeekDates = this.weekManager.getWeekDates(this.weekManager.currentWeekOffset).map(date =>
            date.toISOString().split('T')[0]
        );

        this.lessonManager.lessons.forEach(lesson => {
            try {
                // Для всех уроков (и разовых, и постоянных) проверяем точное совпадение даты
                if (!currentWeekDates.includes(lesson.date)) {
                    return;
                }

                const lessonDate = new Date(lesson.date);
                const dayOfWeek = this.weekManager.getDayOfWeek(lessonDate);
                const hour = parseInt(lesson.time.split(':')[0]);

                const dayElement = document.getElementById(dayOfWeek);
                if (!dayElement) return;

                const hourElement = dayElement.children[hour - this.startHour];
                if (hourElement) {
                    hourElement.innerHTML = this.lessonManager.createLessonHTML(lesson);
                }
            } catch (error) {
                console.error('Ошибка:', error);
            }
        });
    }

    updateScheduleDisplay() {
        this.clearSchedule();
        this.lessonManager.clearAllLessons();
        this.displayOpenSlots();
        this.displayLessons();
    }

    nextWeek() {
        this.weekManager.currentWeekOffset++;
        this.updateCalendar();
        this.updateScheduleDisplay();
    }

    prevWeek() {
        this.weekManager.currentWeekOffset--;
        this.updateCalendar();
        this.updateScheduleDisplay();
    }

    goToCurrentWeek() {
        if (this.weekManager.currentWeekOffset !== 0) {
            this.weekManager.currentWeekOffset = 0;
            this.updateCalendar();
            this.updateScheduleDisplay();
        }
    }

    updateCalendar() {
        this.weekManager.updateHeaderDates();
        this.weekManager.updateWeekInfo();
    }

    async loadSchedule(teacherId = currentUserId, startDate = null, endDate = null) {
        try {
            const {start: weekStart, end: weekEnd} = this.weekManager.getWeekRange(this.weekManager.currentWeekOffset);
            const formatDate = (date) => date.toISOString().split('T')[0];
            const queryStartDate = startDate || formatDate(weekStart);
            const queryEndDate = endDate || formatDate(weekEnd);
            const effectiveTeacherId = teacherId || await this.getMyId();

            const response = await repository.getLessons(effectiveTeacherId, queryStartDate, queryEndDate);
            console.log('Server response:', response);

            let lessons = [];
            if (response && typeof response === 'object' && Array.isArray(response.results)) {
                lessons = response.results;
            } else if (Array.isArray(response)) {
                lessons = response;
            } else {
                console.warn('Unexpected response format, initializing empty lessons');
                this.lessons = [];
            }
            // Генерируем фейковые уроки для регулярных занятий
            const fakeLessons = [];
            const today = new Date();
            const endDateGeneration = new Date();
            const futureDays = 30
            // Генерируем фейковые уроки на n дней вперед
            endDateGeneration.setDate(today.getDate() + futureDays);

            lessons.forEach(lesson => {
                if (lesson.lesson_type === 'recurring' && lesson.schedule && lesson.schedule.length > 0 && lesson.status === 'scheduled') {
                    const generatedLessons = this.lessonManager.generateFutureLessons(lesson, endDateGeneration);
                    fakeLessons.push(...generatedLessons);

                    // Фильтруем фейки, которые совпадают с оригиналом по дате/времени
                    const filteredGenerated = generatedLessons.filter(fake =>
                        fake.date !== lesson.date || fake.time !== lesson.time
                    );

                    fakeLessons.push(...filteredGenerated);
                }
            });

            // Объединяем реальные и фейковые уроки
            this.lessonManager.lessons = [...lessons, ...fakeLessons];

            this.openSlots = await repository.getOpenSlots(teacherId);
            this.generateTimeSlots();
            this.updateCalendar();
            this.updateScheduleDisplay();

        } catch (error) {
            console.error('Ошибка загрузки расписания:', error);
            showNotification("Ошибка загрузки расписания", "error");
            this.lessons = [];
        }
    }

    async getMyId() {
        return currentUserId;
    }

    updateWorkingHours(start, end) {
        if (!this.lessonManager.lessons) {
            console.warn("Расписание не загружено");
            return;
        }

        this.startHour = start;
        this.endHour = end;
        this.generateTimeSlots();
        this.updateScheduleDisplay();
    }

    updateCalendarUi() {
        this.generateTimeSlots();
        this.updateScheduleDisplay();
    }

    async updateOpenSlots() {
        try {
            await repository.updateOpenSlots(this.openSlots);
        } catch (error) {
            console.error("Ошибка при обновлении свободных слотов:", error);
            showNotification("Ошибка при обновлении слотов", "error");
        }
    }
}