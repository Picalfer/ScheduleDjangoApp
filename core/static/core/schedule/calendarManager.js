import {DAYS_OF_WEEK} from "./utils.js";
import {showNotification} from "./notifications.js";
import {repository, scheduleState, settingsManager} from "./app.js";
import {WeekManager} from "./weekManager.js";
import {LessonManager} from "./lessonManager.js";

const LOG_PREFIX = '[CM]';

export class CalendarManager {

    constructor() {
        console.log(`${LOG_PREFIX} constructor() - начал выполнение`);
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
        console.log(`${LOG_PREFIX} constructor() - завершил выполнение`);
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
        console.log(`${LOG_PREFIX} displayLessons() - начал выполнение`);
        if (!Array.isArray(this.lessonManager.lessons)) {
            console.warn("Некорректные данные уроков");
            return;
        }

        const currentWeekDates = this.weekManager.getWeekDates(this.weekManager.currentWeekOffset).map(date =>
            date.toISOString().split('T')[0]
        );

        // Создаем объект для группировки уроков по ячейкам времени
        const lessonsByTimeSlot = {};

        // Сначала группируем все уроки
        this.lessonManager.lessons.forEach(lesson => {
            try {
                if (!currentWeekDates.includes(lesson.date)) {
                    return;
                }

                const lessonDate = new Date(lesson.date);
                const dayOfWeek = this.weekManager.getDayOfWeek(lessonDate);
                const hour = parseInt(lesson.time.split(':')[0]);

                // Создаем ключ для группировки (день + время)
                const timeSlotKey = `${dayOfWeek}_${hour}`;

                if (!lessonsByTimeSlot[timeSlotKey]) {
                    lessonsByTimeSlot[timeSlotKey] = [];
                }
                lessonsByTimeSlot[timeSlotKey].push(lesson);

            } catch (error) {
                console.error('Ошибка:', error);
            }
        });

        // Теперь рендерим сгруппированные уроки
        Object.entries(lessonsByTimeSlot).forEach(([timeSlotKey, lessons]) => {
            try {
                const [dayOfWeek, hour] = timeSlotKey.split('_');
                const numericHour = parseInt(hour);

                const dayElement = document.getElementById(dayOfWeek);
                if (!dayElement) return;

                const hourElement = dayElement.children[numericHour - this.startHour];
                if (!hourElement) return;

                // Очищаем ячейку перед рендерингом
                hourElement.innerHTML = '';

                // Проверяем, есть ли в этой ячейке конфликт (больше одного урока И хотя бы один запланирован)
                const hasScheduledLesson = lessons.some(lesson => lesson.status === 'scheduled');
                const hasConflict = lessons.length > 1 && hasScheduledLesson;

                if (lessons.length === 1) {
                    // Один урок - обычный рендеринг
                    hourElement.innerHTML = this.lessonManager.createLessonHTML(lessons[0]);
                } else {
                    // Несколько уроков - специальный рендеринг
                    lessons.forEach((lesson, index) => {
                        hourElement.innerHTML += this.lessonManager.createLessonHTML(
                            lesson,
                            true,  // isMultiple = true
                            index,
                            lessons.length
                        );
                    });

                    // Добавляем класс для стилизации конфликтных ячеек только если есть конфликт
                    if (hasConflict) {
                        hourElement.classList.add('has-conflict');
                        hourElement.title = `Конфликт расписания: ${lessons.length} урока в одно время (есть запланированные)`;
                    } else {
                        hourElement.classList.remove('has-conflict');
                        hourElement.title = `Несколько уроков: ${lessons.length} урока (все обработаны)`;
                    }
                }

            } catch (error) {
                console.error('Ошибка рендеринга ячейки:', error);
            }
        });

        // Показываем предупреждение о конфликтах
        this.showScheduleConflicts(lessonsByTimeSlot);
        console.log(`${LOG_PREFIX} displayLessons() - завершил выполнение, обработано уроков: ${this.lessonManager.lessons?.length || 0}`);
    }

    showScheduleConflicts(lessonsByTimeSlot) {
        console.log(`${LOG_PREFIX} showScheduleConflicts() - начал выполнение`);
        const conflicts = Object.entries(lessonsByTimeSlot)
            .filter(([_, lessons]) => {
                // Фильтруем только те ячейки, где есть конфликт:
                // больше одного урока И хотя бы один запланирован
                const hasScheduledLesson = lessons.some(lesson => lesson.status === 'scheduled');
                return lessons.length > 1 && hasScheduledLesson;
            })
            .map(([timeSlotKey, lessons]) => {
                const [dayOfWeek, hour] = timeSlotKey.split('_');
                const scheduledLessons = lessons.filter(lesson => lesson.status === 'scheduled');

                return {
                    day: dayOfWeek,
                    hour: parseInt(hour),
                    totalCount: lessons.length,
                    scheduledCount: scheduledLessons.length,
                    hasScheduledLessons: scheduledLessons.length > 0,
                    lessons: lessons
                };
            });

        if (conflicts.length > 0) {
            const conflictMessage = `Обнаружено ${conflicts.length} конфликт(ов) в расписании`;
            showNotification(conflictMessage, "error", 5000);

            // Логируем конфликты для отладки
            console.log('Конфликты расписания:', conflicts);
        }
        console.log(`${LOG_PREFIX} showScheduleConflicts() - завершил выполнение, найдено конфликтов: ${conflicts.length}`);
    }

    updateScheduleDisplay() {
        console.log(`${LOG_PREFIX} updateScheduleDisplay() - начал выполнение`);
        this.clearSchedule();
        this.lessonManager.clearAllLessons();
        this.displayOpenSlots();
        this.displayLessons();
        console.log(`${LOG_PREFIX} updateScheduleDisplay() - завершил выполнение`);
    }

    prevWeek() {
        console.log(`${LOG_PREFIX} prevWeek() - переключение на предыдущую неделю`);
        this.weekManager.currentWeekOffset--;
        this.updateCalendar();
        this.updateScheduleDisplay();
    }

    nextWeek() {
        console.log(`${LOG_PREFIX} nextWeek() - переключение на следующую неделю`);
        this.weekManager.currentWeekOffset++;
        this.updateCalendar();
        this.updateScheduleDisplay();
    }

    goToCurrentWeek() {
        console.log(`${LOG_PREFIX} goToCurrentWeek() - переход к текущей неделе`);
        if (this.weekManager.currentWeekOffset !== 0) {
            this.weekManager.currentWeekOffset = 0;
            this.updateCalendar();
            this.updateScheduleDisplay();
        } else {
            console.log(`${LOG_PREFIX} goToCurrentWeek() - уже на текущей неделе, пропускаем`);
        }
    }

    updateCalendar() {
        console.log(`${LOG_PREFIX} updateCalendar() - начал выполнение`);
        this.weekManager.updateHeaderDates();
        this.weekManager.updateWeekInfo();
        this.generateTimeSlots();
        this.updateScheduleDisplay();
        console.log(`${LOG_PREFIX} updateCalendar() - завершил выполнение`);
    }

    async loadSchedule(teacherId = currentTeacherId, userId = currentUserId, startDate = null, endDate = null) {
        console.log(`${LOG_PREFIX} loadSchedule() - начал выполнение, teacherId: ${teacherId}`);
        try {
            const {start: weekStart, end: weekEnd} = this.weekManager.getWeekRange(this.weekManager.currentWeekOffset);
            const formatDate = (date) => date.toISOString().split('T')[0];
            const queryStartDate = startDate || formatDate(weekStart);
            const queryEndDate = endDate || formatDate(weekEnd);

            const effectiveTeacherId = teacherId || await this.getMyTeacherId();
            const effectiveUserId = userId || await this.getMyId();

            const response = await repository.getLessons(effectiveTeacherId, queryStartDate, queryEndDate);
            console.log(`Lessons for teacher ${teacherId}: `, response);

            let lessons = [];
            if (response && typeof response === 'object' && Array.isArray(response.results)) {
                lessons = response.results;
            } else if (Array.isArray(response)) {
                lessons = response;
            } else {
                console.warn('Unexpected response format, initializing empty lessons');
                this.lessons = [];
            }

            const fakeLessons = [];
            const today = new Date();
            const endDateGeneration = new Date();
            const futureDays = 30;
            endDateGeneration.setDate(today.getDate() + futureDays);

            lessons.forEach(lesson => {
                if (lesson.lesson_type === 'recurring' &&
                    lesson.schedule &&
                    lesson.schedule.length > 0 &&
                    lesson.status === 'scheduled') {

                    const generatedLessons = this.lessonManager.generateFutureLessons(lesson, endDateGeneration);

                    const uniqueFakeLessons = generatedLessons.filter((fake, index, self) =>
                            index === self.findIndex(f =>
                                f.date === fake.date &&
                                f.time === fake.time
                            )
                    );

                    fakeLessons.push(...uniqueFakeLessons);
                }
            });

            console.log(`${LOG_PREFIX} loadSchedule() - получено уроков: ${lessons.length}, сгенерировано fakeLessons: ${fakeLessons.length}`);
            this.lessonManager.lessons = [...lessons, ...fakeLessons];
            this.openSlots = await repository.getOpenSlots(effectiveTeacherId);

            console.log(`${LOG_PREFIX} loadSchedule() - открытые слоты загружены`);

            this.generateTimeSlots();
            this.updateCalendar();
            this.updateScheduleDisplay();

        } catch (error) {
            console.error(`${LOG_PREFIX} loadSchedule() - ошибка:`, error);
            showNotification("Ошибка загрузки расписания", "error");
            this.lessons = [];
        }
        console.log(`${LOG_PREFIX} loadSchedule() - завершил выполнение`);
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