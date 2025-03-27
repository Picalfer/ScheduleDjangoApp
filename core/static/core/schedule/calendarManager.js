import * as repository from './repository.js';
import {showNotification} from "./utils.js";

const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export class CalendarManager {
    constructor() {
        this.currentWeekOffset = 0;
        this.lessons = {};
        this.openSlots = {};
        this.displayedLessons = new Set();
        this.startHour = 6;
        this.endHour = 18;
    }

    getWeekDates(offset = 0) {
        const today = new Date();
        const currentDay = today.getDay();
        const diff = currentDay === 0 ? 6 : currentDay - 1;

        const monday = new Date(today);
        monday.setDate(today.getDate() - diff + (offset * 7));

        const dates = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            dates.push(date); // Возвращаем объект Date, а не число
        }

        return dates;
    }

    formatDate(date) {
        const months = [
            'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
            'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
        ];
        return `${date.getDate()} ${months[date.getMonth()]}`;
    }

    updateHeaderDates() {
        const dates = this.getWeekDates(this.currentWeekOffset);
        const dateElements = document.querySelectorAll('.date');
        const dayHeaders = document.querySelectorAll('.day-header');

        const today = new Date();
        const currentDate = today.getDate();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        dateElements.forEach((element, index) => {
            const displayedDate = new Date(today);
            displayedDate.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1) + index + (this.currentWeekOffset * 7));

            // Используем formatDate для корректного отображения даты
            element.textContent = this.formatDate(displayedDate);

            if (displayedDate.getDate() === currentDate &&
                displayedDate.getMonth() === currentMonth &&
                displayedDate.getFullYear() === currentYear) {
                dayHeaders[index].classList.add('current-day');
            } else {
                dayHeaders[index].classList.remove('current-day');
            }
        });
    }

    updateWeekInfo() {
        const today = new Date();
        const currentDay = today.getDay();
        const diff = currentDay === 0 ? 6 : currentDay - 1;

        const monday = new Date(today);
        monday.setDate(today.getDate() - diff + (this.currentWeekOffset * 7));

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const weekRangeElement = document.getElementById('week-range');
        weekRangeElement.textContent = `${this.formatDate(monday)} - ${this.formatDate(sunday)}`;
    }

    clearSchedule() {
        document.querySelectorAll('.week-day .hour').forEach(hour => {
            if (!hour.querySelector('.lesson')) {
                hour.className = 'hour';
                hour.innerHTML = '';
            }
        });
    }

    createLessonHTML(lesson) {
        // 1. Проверяем статус урока (защита от undefined)
        const isCompleted = lesson.status && lesson.status.toLowerCase() === 'completed';

        // 3. Формируем HTML
        return `
    <div class="lesson ${lesson.is_recurring ? 'permanent' : 'one-time'} ${isCompleted ? 'completed' : ''}" 
         data-lesson-id="${lesson.id}"
         data-status="${lesson.status || 'scheduled'}"
         onclick="window.openLessonModal(${JSON.stringify(lesson).replace(/"/g, '&quot;')})">
        <h4>${lesson.is_recurring ? '🔄 Постоянный' : '1️⃣ Разовый'} урок</h4>
        <p>👩‍🎓 ${lesson.student_name || `Student ${lesson.student}`}</p>
        <p>📚 ${lesson.subject}</p>
    </div>
    `;
    }

    generateTimeSlots() {
        const timeColumn = document.querySelector('.time-column');
        const weekDays = document.querySelectorAll('.week-day');

        // Очищаем существующие слоты
        timeColumn.innerHTML = '';
        weekDays.forEach(day => day.innerHTML = '');

        // Создаем новые слоты времени
        for (let hour = this.startHour; hour <= this.endHour; hour++) {
            // Форматируем час в "HH:00"
            const formattedHour = `${String(hour).padStart(2, '0')}:00`;

            // Добавляем время в колонку времени
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time';
            timeSlot.innerHTML = `<p>${formattedHour}</p>`;
            timeColumn.appendChild(timeSlot);

            // Добавляем пустые ячейки для каждого дня
            weekDays.forEach((day, dayIndex) => {
                const hourSlot = document.createElement('div');
                hourSlot.className = 'hour';

                // Добавляем атрибуты data-day и data-hour
                hourSlot.setAttribute('data-day', daysOfWeek[dayIndex]); // Используем название дня
                hourSlot.setAttribute('data-hour', formattedHour); // Используем отформатированный час

                day.appendChild(hourSlot);
            });
        }
    }

    displayOpenSlots(days) {
        if (!this.openSlots) {
            console.warn("openSlots не загружены или равны null");
            return;
        }

        days.forEach((day) => {
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

    displayRegularLessons(days, dates) {
        if (!this.lessons?.students) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        this.lessons.students.forEach(student => {
            student.regularSchedule.forEach(lesson => {
                // Проверяем что урок активен на текущей неделе
                const lessonDayIndex = days.indexOf(lesson.day);
                if (lessonDayIndex === -1) return;

                const lessonDate = new Date(dates[lessonDayIndex]);
                const startDate = new Date(lesson.start_date); // Получаем дату начала

                // Пропускаем если дата урока раньше start_date
                if (lessonDate < startDate) return;

                const hour = parseInt(lesson.time.split(':')[0]);
                if (hour >= this.startHour && hour <= this.endHour) {
                    const dayElement = document.getElementById(lesson.day);
                    if (dayElement) {
                        const hourElement = dayElement.children[hour - this.startHour];
                        if (hourElement) {
                            hourElement.innerHTML = this.createLessonHTML(lesson);
                        }
                    }
                }
            });
        });
    }

    displayOneTimeLessons() {
        if (!this.lessons?.students) return;

        const {start: weekStart, end: weekEnd} = this.getWeekRange(this.currentWeekOffset);

        this.lessons.students.forEach(student => {
            student.oneTimeLessons.forEach(lesson => {
                try {
                    const lessonDate = new Date(lesson.date);
                    if (lessonDate >= weekStart && lessonDate <= weekEnd) {
                        const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday',
                            'thursday', 'friday', 'saturday'][lessonDate.getDay()];
                        const hour = parseInt(lesson.time.split(':')[0]);

                        if (hour >= this.startHour && hour <= this.endHour) {
                            const dayElement = document.getElementById(dayOfWeek);
                            if (dayElement) {
                                const hourElement = dayElement.children[hour - this.startHour];
                                if (hourElement) {
                                    hourElement.innerHTML = this.createLessonHTML(lesson);
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error('Error processing lesson:', lesson, e);
                }
            });
        });
    }

    updateScheduleDisplay() {
        if (!this.lessons || !this.lessons.students) {
            return;
        }

        this.clearSchedule();
        this.displayedLessons.clear();

        const dates = this.getWeekDates(this.currentWeekOffset); // Используем currentWeekOffset

        // Очищаем все ячейки перед отображением уроков
        this.clearAllLessons(daysOfWeek);

        // Отображаем открытые слоты
        this.displayOpenSlots(daysOfWeek);

        // Проверяем наличие данных о студентах перед отображением регулярных уроков
        if (this.lessons.students && Array.isArray(this.lessons.students)) {
            this.displayRegularLessons(daysOfWeek, dates);
        } else {
            console.warn("Нет данных о студентах для отображения регулярных уроков.");
        }

        // Отображаем разовые уроки
        this.displayOneTimeLessons();
    }

    clearAllLessons(days) {
        days.forEach(day => {
            const dayElement = document.getElementById(day);
            if (dayElement) {
                const hourElements = dayElement.children;
                for (let hourElement of hourElements) {
                    hourElement.innerHTML = ''; // Очищаем содержимое ячейки
                }
            }
        });
    }

    getWeekRange(offset = 0) {
        const today = new Date();
        const currentDay = today.getDay();
        const diff = currentDay === 0 ? 6 : currentDay - 1;

        const monday = new Date(today);
        monday.setDate(today.getDate() - diff + (offset * 7));

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        return {start: monday, end: sunday};
    }

    nextWeek() {
        this.currentWeekOffset++;
        this.updateCalendar();
        this.updateScheduleDisplay();
    }

    prevWeek() {
        this.currentWeekOffset--;
        this.updateCalendar();
        this.updateScheduleDisplay();
    }

    goToCurrentWeek() {
        this.currentWeekOffset = 0;
        this.updateCalendar();
        this.updateScheduleDisplay();
    }

    updateCalendar() {
        this.updateHeaderDates();
        this.updateWeekInfo();
    }

    async loadSchedule() {
        try {
            // 1. Получаем текущую неделю
            const {start: weekStart, end: weekEnd} = this.getWeekRange(this.currentWeekOffset);

            // 2. Форматируем даты в YYYY-MM-DD
            const formatDate = (date) => date.toISOString().split('T')[0];
            const startDate = formatDate(weekStart);
            const endDate = formatDate(weekEnd);

            // 3. Получаем ID текущего пользователя (предполагаем, что это учитель)
            const teacherId = await this.getMyId(); // Используем вашу существующую функцию

            // 4. Загружаем данные
            const timeSlots = await repository.getLessons(teacherId, startDate, endDate);
            console.log(timeSlots.results)
            // 5. Преобразуем в старый формат
            this.lessons = this.convertTimeSlotsToLegacyFormat(timeSlots.results);

            this.openSlots = await repository.getOpenSlots();
            this.generateTimeSlots();
            this.updateCalendar();
            this.updateScheduleDisplay();
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            showNotification("Ошибка загрузки расписания", "error");
        }
    }

    async getMyId() {
        return currentUserId;
    }

    convertTimeSlotsToLegacyFormat(timeSlots) {
        const result = {students: []};
        const studentsMap = new Map();

        timeSlots.forEach(slot => {
            if (!studentsMap.has(slot.student)) {
                studentsMap.set(slot.student, {
                    id: slot.student,
                    name: `Student ${slot.student}`,
                    regularSchedule: [],
                    oneTimeLessons: []
                });
            }

            const is_not_recurring = slot.lesson_type === 'single'

            const student = studentsMap.get(slot.student);
            const lessonData = {
                id: slot.id,
                date: slot.date,
                start_date: slot.start_date || slot.date, // Используем start_date если есть
                time: slot.time,
                lesson_topic: slot.lesson_topic,
                lesson_notes: slot.lesson_notes,
                homework: slot.homework,
                subject: slot.subject,
                status: slot.status || 'scheduled',
                is_recurring: !is_not_recurring
            };

            if (!is_not_recurring) {
                const date = new Date(slot.start_date || slot.date);
                const day = ['sunday', 'monday', 'tuesday', 'wednesday',
                    'thursday', 'friday', 'saturday'][date.getDay()];

                student.regularSchedule.push({
                    ...lessonData,
                    day: day,
                    time: slot.time.split(':').slice(0, 2).join(':')
                });
            } else {
                student.oneTimeLessons.push(lessonData);
            }
        });

        result.students = Array.from(studentsMap.values());
        console.log(result)
        return result;
    }

    updateWorkingHours(start, end) {
        if (!this.lessons) {
            console.warn("Расписание не загружено или не содержит информации о студентах.");
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
            // console.log("Открытые часы успешно обновлены.");
        } catch (error) {
            console.error("Ошибка при обновлении расписания:", error);
        }
    }

    //for admin only
    async addNewStudent(teacherId, studentData) {
        const teacherSchedule = await repository.getSchedule(teacherId)

        console.log(teacherSchedule)
        teacherSchedule.students.push(
            studentData
        )
        console.log(teacherSchedule)

        repository.updateSchedule(teacherSchedule, teacherId)
            .then(async () => {
                console.log('Расписание успешно добавлено');
                if (teacherId === currentUserId) {
                    console.log("обновили своё расписание")
                    this.lessons = teacherSchedule;
                    this.updateCalendarUi();
                }
                showNotification("Расписание успешно добавлено", "success");
            })
            .catch((error) => {
                console.error('Ошибка при добавлении расписания:', error);
                showNotification("Ошибка при добавлении расписания", "error");
            });
    }
}