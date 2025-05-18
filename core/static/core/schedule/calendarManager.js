import {DAYS_OF_WEEK, showNotification} from "./utils.js";
import {repository, scheduleState, settingsManager} from "./app.js";
import {WeekManager} from "./weekManager.js";
import {LessonManager} from "./lessonManager.js";

export class CalendarManager {

    constructor() {
        this.lessonManager = new LessonManager();
        this.weekManager = new WeekManager();
        this.openSlots = {};
        this.startHour = 6;
        this.endHour = 18;

        scheduleState.teacherId = currentTeacherId
        scheduleState.userId = currentUserId
        scheduleState.isAnother = false

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
        const now = new Date();
        const currentHour = now.getHours();
        const currentDayIndex = now.getDay(); // 0 (воскресенье) - 6 (суббота)

        // Очищаем существующие слоты
        timeColumn.innerHTML = '';
        weekDays.forEach(day => day.innerHTML = '');

        // Генерируем слоты для каждого часа в диапазоне
        Array.from({length: this.endHour - this.startHour + 1}, (_, i) => this.startHour + i)
            .forEach(hour => {
                const formattedHour = `${String(hour).padStart(2, '0')}:00`;

                // Добавляем метку времени в колонку
                const timeElement = document.createElement('div');
                timeElement.className = 'time';
                timeElement.innerHTML = `<p>${formattedHour}</p>`;

                // Ярко подсвечиваем текущий час в колонке времени
                if (hour === currentHour) {
                    timeElement.classList.add('current-time-slot');
                }

                timeColumn.appendChild(timeElement);

                // Добавляем ячейки для каждого дня недели
                weekDays.forEach((day, dayIndex) => {
                    const hourElement = document.createElement('div');
                    hourElement.className = 'hour';
                    hourElement.dataset.day = DAYS_OF_WEEK[dayIndex];
                    hourElement.dataset.hour = formattedHour;

                    // Добавляем линию текущего часа для всех дней
                    if (hour === currentHour) {
                        hourElement.classList.add('current-hour-line');
                        // Дополнительно выделяем текущий день
                        if (dayIndex === currentDayIndex - 1) {
                            hourElement.classList.add('current-hour-active');
                        }
                    }

                    day.appendChild(hourElement);
                });
            });
    }

    displayOpenSlots() {
        if (!this.openSlots) {
            console.warn("openSlots не загружены");
            return;
        }

        // Убираем все открытые окна и временные метки
        document.querySelectorAll('.open-window, .current-hour, .current-hour-active').forEach(el => {
            el.classList.remove('open-window', 'current-hour', 'current-hour-active');
        });

        const now = new Date();
        const currentHour = now.getHours();

        // Добавляем актуальные открытые окна
        DAYS_OF_WEEK.forEach(day => {
            const dayElement = document.getElementById(day);
            if (!dayElement) {
                console.error("Элемент дня не найден:", day);
                return;
            }

            // Добавляем подсветку текущего часа для всех дней
            if (currentHour >= this.startHour && currentHour <= this.endHour) {
                const hourElement = dayElement.children[currentHour - this.startHour];
                if (hourElement) {
                    hourElement.classList.add('current-hour');
                }
            }

            // Добавляем открытые окна
            const slots = this.openSlots[day] || [];
            slots.forEach(time => {
                const hour = parseInt(time.split(':')[0]);
                if (hour >= this.startHour && hour <= this.endHour) {
                    const hourElement = dayElement.children[hour - this.startHour];
                    if (hourElement) {
                        hourElement.classList.add('open-window');
                    }
                }
            });
        });

        // Особо выделяем текущий день
        const currentDayIndex = now.getDay();
        if (currentDayIndex > 0 && currentDayIndex <= DAYS_OF_WEEK.length) {
            const currentDayElement = document.getElementById(DAYS_OF_WEEK[currentDayIndex - 1]);
            if (currentDayElement && currentHour >= this.startHour && currentHour <= this.endHour) {
                const hourElement = currentDayElement.children[currentHour - this.startHour];
                if (hourElement) {
                    hourElement.classList.add('current-hour-active');
                }
            }
        }
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
        this.generateTimeSlots();
        this.updateScheduleDisplay();
    }

    async loadSchedule(teacherId = currentTeacherId, userId = currentUserId, startDate = null, endDate = null) {
        try {
            const {start: weekStart, end: weekEnd} = this.weekManager.getWeekRange(this.weekManager.currentWeekOffset);
            const formatDate = (date) => date.toISOString().split('T')[0];
            const queryStartDate = startDate || formatDate(weekStart);
            const queryEndDate = endDate || formatDate(weekEnd);

            const effectiveTeacherId = teacherId || await this.getMyTeacherId();
            const effectiveUserId = userId || await this.getMyId();

            const response = await repository.getLessons(effectiveTeacherId, queryStartDate, queryEndDate);
            console.log(`Lessons for teacher ${teacherId} (search by teacher id): `, response);

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

            this.openSlots = await repository.getOpenSlots(effectiveUserId);
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

    async getMyTeacherId() {
        return currentTeacherId;
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
            showNotification(`Открытые окна обновлены`, "success");
        } catch (error) {
            console.error("Ошибка при обновлении свободных слотов:", error);
            showNotification(
                error.message || "Ошибка при обновлении окон",
                "error"
            );
        }
    }
}