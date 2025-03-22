import * as repository from './repository.js';
import {showNotification} from "./utils.js";

const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export class CalendarManager {
    constructor() {
        this.currentWeekOffset = 0;
        this.schedule = null;
        this.openSlots = null;
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
        const emoji = lesson.status === 'permanent' ? '🔄' : '1️⃣';
        const statusText = lesson.status === 'permanent' ? 'Постоянный урок' : 'Разовый урок';

        // Добавляем смайлики для ученика и предмета
        const studentEmoji = '👩‍🎓'; // Смайлик студента
        const subjectEmoji = '📚'; // Смайлик предмета

        return `
            <div class="lesson ${lesson.status}" 
                 data-student-id="${lesson.id}" 
                 onclick="window.openLessonModal(${JSON.stringify(lesson).replace(/"/g, '&quot;')})">
                <h4 data-emoji="${emoji}">${statusText}</h4>
                <p>${studentEmoji} <span id="student-name">${lesson.student}</span></p>
                <p>${subjectEmoji} <span id="subject-name">${lesson.subject}</span></p>
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
        days.forEach((day, dayIndex) => {
            const dayElement = document.getElementById(day);
            if (!dayElement) {
                console.error("Элемент дня не найден:", day);
                return;
            }

            const slots = this.openSlots.weeklyOpenSlots[day] || [];
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
        if (!this.schedule || !this.schedule.students) {
            console.warn('Нет данных о студентах в schedule');
            return;
        }

        // Перебираем студентов
        this.schedule.students.forEach(student => {
            const {id, name, regularSchedule} = student;

            // Проверяем, есть ли регулярное расписание
            if (regularSchedule && Array.isArray(regularSchedule)) {
                regularSchedule.forEach(lesson => {
                    const {day, time, subject} = lesson;
                    const hour = parseInt(time.split(':')[0]);

                    // Проверяем, что час находится в рабочем диапазоне
                    if (hour >= this.startHour && hour <= this.endHour) {
                        const dayElement = document.getElementById(day);
                        if (dayElement) {
                            const hourIndex = hour - this.startHour;
                            const hourElement = dayElement.children[hourIndex];

                            if (hourElement) {
                                // Проверяем, что day существует в days
                                const dayIndex = days.indexOf(day);
                                if (dayIndex === -1) {
                                    console.warn(`День "${day}" не найден в массиве days`);
                                    return;
                                }

                                // Проверяем, что dates[dayIndex] является объектом Date
                                const date = dates[dayIndex];
                                if (!(date instanceof Date)) {
                                    console.warn(`dates[${dayIndex}] не является объектом Date`);
                                    return;
                                }

                                // Форматируем дату
                                const formattedDate = date.toISOString().split('T')[0];

                                // Убираем проверку на доступность слота
                                // Обновляем содержимое элемента
                                hourElement.innerHTML = this.createLessonHTML({
                                    id: id,
                                    date: formattedDate,
                                    time: time,
                                    student: name,
                                    subject: subject,
                                    status: 'permanent'
                                });
                            }
                        }
                    }
                });
            } else {
                console.warn(`Нет регулярного расписания для студента: ${name}`);
            }
        });
    }

    displayOneTimeLessons() {
        if (!this.schedule || !this.schedule.students) {
            console.warn('Нет данных о студентах в schedule');
            return;
        }

        // Массив с английскими названиями дней недели
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        // Получаем диапазон текущей недели
        const {start: weekStart, end: weekEnd} = this.getWeekRange(this.currentWeekOffset);

        // Перебираем студентов
        this.schedule.students.forEach(student => {
            const {id, name, oneTimeLessons} = student;

            // Проверяем, есть ли разовые уроки
            if (oneTimeLessons && Array.isArray(oneTimeLessons)) {

                oneTimeLessons.forEach(lesson => {
                    const {date, time, subject} = lesson;

                    // Проверяем, что date существует и является строкой
                    if (!date || typeof date !== 'string') {
                        console.warn(`Некорректная дата для студента ${name}: ${date}`);
                        return;
                    }

                    // Преобразуем строку в объект Date
                    const lessonDate = new Date(date);

                    // Проверяем, что lessonDate является корректной датой
                    if (isNaN(lessonDate.getTime())) {
                        console.warn(`Некорректная дата для студента ${name}: ${date}`);
                        return;
                    }

                    // Проверяем, что дата урока попадает в текущую неделю
                    if (lessonDate < weekStart || lessonDate > weekEnd) {
                        return;
                    }

                    // Проверяем, что время урока находится в рабочем диапазоне
                    const hour = parseInt(time.split(':')[0]);
                    if (hour >= this.startHour && hour <= this.endHour) {
                        // Находим элемент дня
                        const dayOfWeek = daysOfWeek[lessonDate.getDay()]; // Используем английские названия

                        const dayElement = document.getElementById(dayOfWeek);
                        if (dayElement) {
                            const hourIndex = hour - this.startHour;
                            const hourElement = dayElement.children[hourIndex];

                            if (hourElement) {
                                hourElement.innerHTML = this.createLessonHTML({
                                    id: id,
                                    date: date,
                                    time: time,
                                    student: name,
                                    subject: subject,
                                    status: 'one-time'
                                });
                            } else {
                                console.warn(`Ячейка для времени ${time} не найдена в дне ${dayOfWeek}`);
                            }
                        } else {
                            console.warn(`Элемент дня ${dayOfWeek} не найден`);
                        }
                    } else {
                        console.warn(`Время урока ${time} вне рабочего диапазона`);
                    }
                });
            } else {
                console.warn(`Нет разовых уроков для студента: ${name}`);
            }
        });
    }

    updateScheduleDisplay() {
        if (!this.schedule || !this.schedule.students) {
            console.warn("Расписание не загружено или не содержит информации о студентах.");
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
        if (this.schedule.students && Array.isArray(this.schedule.students)) {
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
            this.schedule = await repository.getSchedule();
            this.openSlots = await repository.getOpenSlots();

            if (!this.schedule || !this.schedule.students) {
                console.warn("Данные расписания не загружены или не содержат информации о студентах.");
                return; // Прекращаем выполнение, если данные не загружены
            }

            // Проверяем, что данные загружены и содержат информацию о студентах
            if (!this.schedule || !this.schedule.students || this.schedule.students.length === 0) {
                console.warn("Данные расписания не загружены или не содержат информации о студентах.");
            }

            // Генерируем слоты часов
            this.generateTimeSlots();

            // Обновляем календарь и отображение расписания
            this.updateCalendar();

            this.updateScheduleDisplay();

            // TODO убрать?
            this.updateCalendar();
        } catch (error) {
            console.log('Ошибка загрузки данных:', error);
        }
    }

    updateWorkingHours(start, end) {

        if (!this.schedule || !this.schedule.students) {
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
            repository.updateSchedule(this.schedule);
            console.log("Расписание успешно обновлено в Битриксе.");
        } catch (error) {
            console.error("Ошибка при обновлении расписания:", error);
        }
    }

    async updateOpenSlots() {
        try {
            repository.updateOpenSlots(this.openSlots);
            console.log("Открытые часы успешно обновлены.");
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
                    this.schedule = teacherSchedule;
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