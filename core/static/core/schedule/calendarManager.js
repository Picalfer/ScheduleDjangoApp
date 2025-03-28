import * as repository from './repository.js';
import {showNotification} from "./utils.js";

export class CalendarManager {
    static DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    static MONTH_NAMES = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];

    constructor() {
        this.currentWeekOffset = 0;
        this.lessons = [];
        this.openSlots = {};
        this.displayedLessons = new Set();
        this.startHour = 6;
        this.endHour = 18;
    }

    /**
     * Получает даты недели относительно текущей с учетом смещения
     * @param {number} offset - Смещение в неделях (0 - текущая неделя)
     * @returns {Date[]} Массив дат с понедельника по воскресенье
     */
    getWeekDates(offset = 0) {
        const today = new Date();
        const currentDay = today.getDay();
        // Воскресенье (0) становится 6, чтобы правильно вычислить понедельник
        const diff = currentDay === 0 ? 6 : currentDay - 1;

        const monday = new Date(today);
        monday.setDate(today.getDate() - diff + (offset * 7));

        return Array.from({length: 7}, (_, i) => {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            return date;
        });
    }

    /**
     * Форматирует дату в строку вида "день месяц"
     * @param {Date} date - Дата для форматирования
     * @returns {string} Отформатированная дата
     */
    formatDate(date) {
        return `${date.getDate()} ${CalendarManager.MONTH_NAMES[date.getMonth()]}`;
    }

    /**
     * Обновляет даты в заголовках календаря и подсвечивает текущий день
     */
    updateHeaderDates() {
        const dates = this.getWeekDates(this.currentWeekOffset);
        const dateElements = document.querySelectorAll('.date');
        const dayHeaders = document.querySelectorAll('.day-header');

        const today = new Date();
        const currentDate = today.getDate();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        dateElements.forEach((element, index) => {
            const displayedDate = dates[index]; // Используем уже вычисленные даты из getWeekDates
            element.textContent = this.formatDate(displayedDate);

            // Проверяем, является ли день текущим
            const isCurrentDay = displayedDate.getDate() === currentDate &&
                displayedDate.getMonth() === currentMonth &&
                displayedDate.getFullYear() === currentYear;

            dayHeaders[index].classList.toggle('current-day', isCurrentDay);
        });
    }

    /**
     * Обновляет информацию о диапазоне недели в заголовке календаря
     */
    updateWeekInfo() {
        const dates = this.getWeekDates(this.currentWeekOffset);
        const [monday, sunday] = [dates[0], dates[6]]; // Первый и последний день недели

        const weekRangeElement = document.getElementById('week-range');
        weekRangeElement.textContent = `${this.formatDate(monday)} - ${this.formatDate(sunday)}`;
    }

    /**
     * Очищает расписание, удаляя все пустые ячейки часов
     * (сохраняет ячейки с уроками)
     */
    clearSchedule() {
        document.querySelectorAll('.week-day .hour').forEach(hour => {
            if (!hour.querySelector('.lesson')) {
                hour.className = 'hour';
                hour.innerHTML = '';
            }
        });
    }

    /**
     * Создает HTML-элемент для отображения урока в календаре
     * @param {Object} lesson - Данные урока
     * @param {number} lesson.id - ID урока
     * @param {string} lesson.lesson_type - Тип урока ('recurring' или 'single')
     * @param {string} lesson.status - Статус урока ('completed', 'scheduled' и т.д.)
     * @param {string} lesson.subject - Предмет урока
     * @param {Object|number} lesson.student - Данные студента или ID студента
     * @param {string} [lesson.student.name] - Имя студента (если есть)
     * @returns {string} HTML-строка для вставки в календарь
     */
    createLessonHTML(lesson) {
        const isRecurring = lesson.lesson_type === 'recurring';
        const isCompleted = lesson.status?.toLowerCase() === 'completed';
        const studentName = lesson.student?.name || `Student ${lesson.student || '?'}`;
        const subject = lesson.subject || 'Без темы';

        return `
                    <div class="lesson ${isRecurring ? 'permanent' : 'one-time'} ${isCompleted ? 'completed' : ''}" 
                         data-lesson-id="${lesson.id}"
                         data-status="${lesson.status || 'scheduled'}"
                         onclick="window.openLessonModal(${JSON.stringify(lesson).replace(/"/g, '&quot;')})">
                        <h4>${isRecurring ? '🔄 Постоянный' : '1️⃣ Разовый'} урок</h4>
                        <p>👩‍🎓 ${studentName}</p>
                        <p>📚 ${subject}</p>
                    </div>
                `;
    }

    /**
     * Генерирует временные слоты для календаря (колонка времени и ячейки для уроков)
     * Создает:
     * - Колонку с отметками времени (в .time-column)
     * - Пустые ячейки для каждого часа в каждом дне недели (в .week-day)
     */
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
                         data-day="${CalendarManager.DAYS_OF_WEEK[dayIndex]}" 
                         data-hour="${formattedHour}">
                    </div>
                `);
                });
            });
    }

    /**
     * Отображает доступные окна для записи
     */
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
        CalendarManager.DAYS_OF_WEEK.forEach(day => {
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


    /**
     * Отображает уроки в календаре для указанных дней и дат
     */
    displayLessons() {
        if (!Array.isArray(this.lessons)) {
            console.warn("Некорректные данные уроков");
            return;
        }

        document.querySelectorAll('.week-day .hour').forEach(hourElement => {
            hourElement.innerHTML = ''; // Полная очистка ячейки
            hourElement.classList.remove('has-lesson');
        });

        const currentWeekDates = this.getWeekDates(this.currentWeekOffset).map(date =>
            date.toISOString().split('T')[0]
        );

        this.lessons.forEach(lesson => {
            try {
                const isRecurring = lesson.lesson_type === 'recurring';

                if (!isRecurring) {
                    if (!currentWeekDates.includes(lesson.date)) {
                        return;
                    }
                } else {
                    const lessonDate = new Date(lesson.date);
                    const startDate = new Date(lesson.start_date || lesson.date);
                    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday',
                        'thursday', 'friday', 'saturday'][lessonDate.getDay()];

                    const dayIndex = CalendarManager.DAYS_OF_WEEK.indexOf(dayOfWeek);
                    if (dayIndex === -1) return;

                    const currentDate = new Date(currentWeekDates[dayIndex]);
                    if (currentDate < startDate) return;
                }

                const lessonDate = new Date(lesson.date);
                const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday',
                    'thursday', 'friday', 'saturday'][lessonDate.getDay()];
                const hour = parseInt(lesson.time.split(':')[0]);

                const dayElement = document.getElementById(dayOfWeek);
                if (!dayElement) return;

                const hourElement = dayElement.children[hour - this.startHour];
                if (hourElement) {
                    hourElement.innerHTML = this.createLessonHTML(lesson);
                }
            } catch (error) {
                console.error('Ошибка:', error);
            }
        });
    }

    /**
     * Обновляет отображение расписания на основе текущих данных
     */
    updateScheduleDisplay() {
        this.clearSchedule();
        this.displayedLessons.clear();
        this.clearAllLessons();
        this.displayOpenSlots();
        this.displayLessons();
    }

    /**
     * Очищает все ячейки с уроками для указанных дней недели
     */
    clearAllLessons() {
        CalendarManager.DAYS_OF_WEEK.forEach(day => {
            const hourSlots = document.querySelectorAll(`[data-day="${day}"] .hour`);

            hourSlots.forEach(slot => {
                if (slot.querySelector('.lesson')) {
                    slot.innerHTML = '';
                }
            });
        });
    }

    /**
     * Возвращает диапазон дат (понедельник-воскресенье) для недели с указанным смещением
     * @param {number} offset - Смещение в неделях (0 - текущая неделя)
     * @returns {{start: Date, end: Date}} Объект с датами начала и конца недели
     */
    getWeekRange(offset = 0) {
        const today = new Date();
        const currentDay = today.getDay();
        const diff = currentDay === 0 ? 6 : currentDay - 1; // Коррекция для воскресенья

        const monday = new Date(today);
        monday.setDate(today.getDate() - diff + (offset * 7));

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        return {start: monday, end: sunday};
    }

    /**
     * Переключает календарь на следующую неделю
     */
    nextWeek() {
        this.currentWeekOffset++;
        this.updateCalendar();
        this.updateScheduleDisplay();
    }

    /**
     * Переключает календарь на предыдущую неделю
     */
    prevWeek() {
        this.currentWeekOffset--;
        this.updateCalendar();
        this.updateScheduleDisplay();
    }

    /**
     * Возвращает календарь к текущей неделе
     */
    goToCurrentWeek() {
        if (this.currentWeekOffset !== 0) {
            this.currentWeekOffset = 0;
            this.updateCalendar();
            this.updateScheduleDisplay();
        }
    }

    /**
     * Обновляет визуальные элементы календаря (заголовки, даты)
     */
    updateCalendar() {
        this.updateHeaderDates();
        this.updateWeekInfo();
    }

    /**
     * Загружает расписание для указанного преподавателя и временного диапазона
     * @param {number|null} teacherId - ID преподавателя (null - текущий пользователь)
     * @param {string|null} startDate - Начальная дата (YYYY-MM-DD)
     * @param {string|null} endDate - Конечная дата (YYYY-MM-DD)
     */
    async loadSchedule(teacherId = null, startDate = null, endDate = null) {
        try {
            const {start: weekStart, end: weekEnd} = this.getWeekRange(this.currentWeekOffset);
            const formatDate = (date) => date.toISOString().split('T')[0];
            const queryStartDate = startDate || formatDate(weekStart);
            const queryEndDate = endDate || formatDate(weekEnd);
            const effectiveTeacherId = teacherId || this.getMyId();

            const response = await repository.getLessons(effectiveTeacherId, queryStartDate, queryEndDate);
            console.log('Server response:', response);

            if (response && typeof response === 'object' && Array.isArray(response.results)) {
                this.lessons = response.results;
            } else {
                console.warn('Unexpected response format, initializing empty lessons');
                this.lessons = [];
            }

            this.openSlots = await repository.getOpenSlots();
            this.generateTimeSlots();
            this.updateCalendar();
            this.updateScheduleDisplay();

        } catch (error) {
            console.error('Ошибка загрузки расписания:', error);
            showNotification("Ошибка загрузки расписания", "error");
            this.lessons = [];
        }
    }

    /**
     * Возвращает ID текущего пользователя
     * @returns {number} ID пользователя
     */
    async getMyId() {
        return currentUserId;
    }

    /**
     * Обновляет рабочие часы отображения календаря
     * @param {number} start - Начальный час (6-23)
     * @param {number} end - Конечный час (6-23)
     */
    updateWorkingHours(start, end) {
        if (!this.lessons) {
            console.warn("Расписание не загружено");
            return;
        }

        this.startHour = start;
        this.endHour = end;
        this.generateTimeSlots();
        this.updateScheduleDisplay();
    }

    /**
     * Полностью обновляет UI календаря (пересоздает слоты и перерисовывает расписание)
     */
    updateCalendarUi() {
        this.generateTimeSlots();
        this.updateScheduleDisplay();
    }

    /**
     * Обновляет свободные слоты преподавателя на сервере
     */
    async updateOpenSlots() {
        try {
            await repository.updateOpenSlots(this.openSlots);
        } catch (error) {
            console.error("Ошибка при обновлении свободных слотов:", error);
            showNotification("Ошибка при обновлении слотов", "error");
        }
    }
}