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

        this.lessons.students.forEach(student => {
            student.regularSchedule.forEach(lesson => {
                const hour = parseInt(lesson.time.split(':')[0]);
                if (hour >= this.startHour && hour <= this.endHour) {
                    const dayElement = document.getElementById(lesson.day);
                    if (dayElement) {
                        const hourElement = dayElement.children[hour - this.startHour];
                        if (hourElement) {
                            // Собираем полные данные урока
                            const lessonData = {
                                id: student.id,
                                date: dates[days.indexOf(lesson.day)].toISOString().split('T')[0],
                                time: lesson.time,
                                status: lesson.status || 'scheduled', // гарантированно есть статус
                                student: student.id,
                                student_name: student.name, // отдельное поле для имени
                                subject: lesson.subject,
                                is_recurring: true
                            };

                            hourElement.innerHTML = this.createLessonHTML(lessonData);
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
                                    // Формируем полные данные урока
                                    const lessonData = {
                                        id: student.id,
                                        date: lesson.date,
                                        time: lesson.time,
                                        status: lesson.status || 'scheduled', // гарантированный статус
                                        student: student.id,
                                        student_name: student.name,
                                        subject: lesson.subject,
                                        is_recurring: false
                                    };

                                    hourElement.innerHTML = this.createLessonHTML(lessonData);
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
        // Реализация зависит от вашей системы аутентификации
        // Например, если ID хранится в localStorage:
        return currentUserId;
    }

    convertTimeSlotsToLegacyFormat(timeSlots) {
        const result = {
            students: []
        };

        // Группируем по студентам
        const studentsMap = new Map();

        timeSlots.forEach(slot => {
            if (!studentsMap.has(slot.student)) {
                studentsMap.set(slot.student, {
                    id: slot.id,  // используем id урока
                    name: `Student ${slot.student}`,
                    regularSchedule: [],
                    oneTimeLessons: [],
                    lessonStatuses: {}  // Добавляем объект для статусов
                });
            }

            const student = studentsMap.get(slot.student);
            const lessonKey = `${slot.date}_${slot.time.split(':').slice(0, 2).join(':')}`;

            // Сохраняем статус урока
            student.lessonStatuses[lessonKey] = slot.status;

            const lesson = {
                date: slot.date,
                time: slot.time,
                subject: slot.subject,
                status: slot.status  // Добавляем статус в каждый урок
            };

            if (slot.is_recurring) {
                const date = new Date(slot.date);
                const day = ['sunday', 'monday', 'tuesday', 'wednesday',
                    'thursday', 'friday', 'saturday'][date.getDay()];
                student.regularSchedule.push({
                    day: day,
                    time: slot.time.split(':').slice(0, 2).join(':'),
                    subject: slot.subject,
                    status: slot.status  // Добавляем статус
                });
            } else {
                student.oneTimeLessons.push({
                    ...lesson,
                    status: slot.status  // Добавляем статус
                });
            }
        });

        result.students = Array.from(studentsMap.values());
        console.log('Converted data with statuses:', result);
        return result;
    }

    async getStudentName(studentId) {
        // Здесь нужно реализовать запрос к API для получения имени студента
        // Например:
        try {
            const response = await fetch(`/api/students/${studentId}/`);
            const data = await response.json();
            return data.name || `Student ${studentId}`;
        } catch {
            return `Student ${studentId}`;
        }
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

    async updateSchedule() {
        try {
            repository.updateSchedule(this.lessons);
            console.log("Расписание успешно обновлено в Битриксе.");
        } catch (error) {
            console.error("Ошибка при обновлении расписания:", error);
        }
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
                const myId = await getMyId()
                if (teacherId === myId) {
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