import * as BX24API from './bx24api.js';
import * as utils from './utils.js';
/*import {Russian} from "flatpickr/dist/l10n/ru.js";
import flatpickr from "flatpickr";*/
import {calendar} from './app.js'

export class AddStudentModal {
    constructor() {
        this.initializeDOMElements()
        this.setupEventListeners();
    }

    initializeDOMElements() {
        this.modal = document.getElementById('add-student-modal');
        this.modalContent = document.getElementById('add-student-modal-content');
        this.closeButton = document.querySelector('#add-student-modal .close');
        this.form = document.getElementById("add-student-form");
        this.cancelButton = this.modal.querySelector(".cancel-button");
        this.submitButton = this.modal.querySelector("#submit-student");

        // дополнительные поля
        this.findClientButton = document.getElementById('find-client-button');
        this.findTeacherButton = document.getElementById('find-teacher-button');
        this.clientIDInput = document.getElementById('client-id');
        this.clientInfo = document.getElementById('client-info');
        this.teacherIDInput = document.getElementById('teacher-id')
        this.teacherInfo = document.getElementById('teacher-info');
        this.addOneTimeLessonButton = document.getElementById('add-one-time-lesson-button');
        this.addRegularLessonButton = document.getElementById('add-regular-lesson-button');
        this.oneTimeLessonsContainer = document.getElementById('one-time-lessons-container');
        this.regularLessonsContainer = document.getElementById('regular-lessons-container');
    }

    setupEventListeners() {
        this.closeButton.onclick = () => this.close();
        this.cancelButton.onclick = () => this.close();

        document.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        this.findClientButton.onclick = (e) => this.findClient(e)
        this.findTeacherButton.onclick = (e) => this.findTeacher(e)
        this.addOneTimeLessonButton.onclick = (e) => this.addOneTimeLesson(e);
        this.addRegularLessonButton.onclick = (e) => this.addRegularLesson(e);

        this.submitButton.onclick = (e) => this.onSubmit(e);
    }

    close() {
        this.modal.style.display = "none";
        this.form.reset();

        this.clientIDInput.value = ''
        this.clientInfo.style.display = 'none';
        this.clientInfo.textContent = '';

        this.teacherIDInput.value = ''
        this.teacherInfo.style.display = 'none';
        this.teacherInfo.textContent = '';

        this.oneTimeLessonsContainer.innerHTML = '';
        this.regularLessonsContainer.innerHTML = '';
    }

    open() {
        BX24API.isAdmin()
            .then((isAdmin) => {
                if (isAdmin) {
                    this.modal.style.display = 'block';
                    this.resetModalScroll();
                }
            })
            .catch((error) => {
                console.error('Ошибка при проверке прав администратора:', error);
            });
    }

    resetModalScroll() {
        if (this.modalContent) {
            this.modalContent.scrollTop = 0; // Устанавливаем положение прокрутки в 0
        } else {
            console.warn('Элемент модального окна не найден');
        }
    }

    findClient(event) {
        event.stopPropagation();

        const clientId = document.getElementById('client-id').value.trim(); // Получаем ID клиента и убираем пробелы

        // Проверяем, что поле не пустое
        if (!clientId) {
            utils.showNotification("Пожалуйста, введите ID клиента.", 'error');
            return;
        }

        BX24API.getClientByID(clientId).then(client => {
            if (client) {
                this.clientInfo.style.display = 'block'; // Показываем элемент с информацией
                this.clientInfo.innerHTML = `
                <div>Имя: <span id="client-name">${client.NAME}</span></div>
                <div>Фамилия: <span  id="client-second-name">${client.SECOND_NAME}</span></div>
                <div>Предмет: <span id="client-subject">${client.UF_CRM_1739691796545}</span></div>
            `;
            } else {
                this.clientInfo.style.display = 'none';
            }
        }).catch(error => {
            console.error("Ошибка получения данных о клиенте:", error);
            utils.showNotification(`Клиент с ID ${clientId} не найден.`, 'error');
        });
    }

    findTeacher(event) {
        event.stopPropagation();

        const teacherId = document.getElementById('teacher-id').value.trim(); // Получаем ID преподавателя и убираем пробелы

        // Проверяем, что поле не пустое
        if (!teacherId) {
            utils.showNotification("Пожалуйста, введите ID преподавателя.", 'error');
            return;
        }

        BX24API.getTeacherByID(teacherId).then(teachers => {
            if (teachers) {
                const teacher = teachers[0];
                this.teacherInfo.style.display = 'block';
                this.teacherInfo.textContent = `Информация о преподавателе с ID ${teacherId}: ${teacher.NAME} ${teacher.LAST_NAME}`;
            } else {
                this.teacherInfo.style.display = 'none';
            }
        }).catch(error => {
            console.error("Ошибка получения данных о преподавателе:", error);
            utils.showNotification(`Клиент с ID ${teacherId} не найден.`, 'error');
        });
    }

    createLessonRow(type) {
        // Создаем новый элемент для урока
        const lessonRow = document.createElement('div');
        lessonRow.className = type === 'one-time' ? 'one-time-lesson-row' : 'regular-lesson-row';

        // Создаем селектор для выбора курса
        const courseSelect = document.createElement('select');
        courseSelect.className = 'course-select';
        courseSelect.innerHTML = `
        <option value="" selected disabled hidden>Курс</option>
        <option value="figma">Figma</option>
        <option value="computer-literacy">Компьютер с нуля</option>
        <option value="scratch">Scratch</option>
        <option value="roblox">Roblox Studio</option>
        <option value="blender">Моделирование в Blender</option>
        <option value="web-development">Создание сайтов</option>
        <option value="python">Программирование на Python</option>
        <option value="unity">Создание игр на Unity</option>
        <option value="olympic-programming">Подготовка к олимпиадам по программированию</option>
        <option value="cpp">Изучение языка C++</option>
    `;
        courseSelect.style.marginRight = "5px"
        // Добавляем селектор курса и кнопку в строку
        lessonRow.appendChild(courseSelect);

        // Возвращаем созданный элемент
        return lessonRow;
    }

    createTimeSelect() {
        // Создаем селектор для выбора времени
        const timeSelect = document.createElement('select');
        timeSelect.className = 'time-select';
        timeSelect.innerHTML = `
        <option value="" selected disabled hidden>Время</option>
    `;

        // Генерируем опции для времени от 00:00 до 23:00
        for (let hour = 0; hour < 24; hour++) {
            const formattedHour = hour.toString().padStart(2, '0') + ':00'; // Форматируем часы
            const option = document.createElement('option');
            option.value = formattedHour;
            option.textContent = formattedHour;
            timeSelect.appendChild(option);
        }

        return timeSelect;
    }

    createDeleteButton(lessonRow) {
        // Создаем кнопку удаления
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-lesson-button';
        deleteButton.type = 'button'; // Указываем, что это кнопка типа button
        deleteButton.innerHTML = '🗑️'; // Эмодзи мусорного бака
        deleteButton.title = 'Удалить урок';

        // Добавляем обработчик события для кнопки удаления
        deleteButton.addEventListener('click', () => {
            lessonRow.classList.add('fade-out'); // Добавляем класс для анимации исчезновения
            setTimeout(() => {
                if (type === 'one-time') {
                    this.oneTimeLessonsContainer.removeChild(lessonRow);
                } else {
                    this.regularLessonsContainer.removeChild(lessonRow);
                }
            }, 300); // Время, соответствующее длительности анимации
        });

        return deleteButton;
    }

    addOneTimeLesson(event) {
        event.preventDefault(); // Предотвращаем отправку формы

        const lessonRow = this.createLessonRow('one-time');

        // Создаем поле для выбора даты через flatpickr
        const dateInput = document.createElement('input');
        dateInput.type = 'text'; // Для использования flatpickr
        dateInput.className = 'lesson-date-input';
        dateInput.placeholder = 'Дата';

        dateInput.style.cursor = 'default';
        dateInput.style.padding = '10px';
        dateInput.style.marginRight = '5px';

        // Инициализируем flatpickr для выбора даты
        flatpickr(dateInput, {
            locale: Russian,
            dateFormat: 'Y-m-d',
        });

        // Добавляем элементы в строку
        lessonRow.appendChild(dateInput);
        lessonRow.appendChild(this.createTimeSelect());
        lessonRow.appendChild(this.createDeleteButton(lessonRow));

        // Добавляем строку в контейнер
        this.oneTimeLessonsContainer.appendChild(lessonRow);
    }

    addRegularLesson(event) {
        event.preventDefault(); // Предотвращаем отправку формы

        const lessonRow = this.createLessonRow('regular');

        // Создаем селектор для выбора дня
        const daySelect = document.createElement('select');
        daySelect.className = 'day-select';
        daySelect.innerHTML = `
        <option value="" selected disabled hidden>День недели</option>
        <option value="monday">Понедельник</option>
        <option value="tuesday">Вторник</option>
        <option value="wednesday">Среда
         <option value="thursday">Четверг</option>
        <option value="friday">Пятница</option>
        <option value="saturday">Суббота</option>
        <option value="sunday">Воскресенье</option>
    `;
        daySelect.style.marginRight = '5px';

        // Добавляем элементы в строку
        lessonRow.appendChild(daySelect);
        lessonRow.appendChild(lessonRow.appendChild(this.createTimeSelect()));
        lessonRow.appendChild(this.createDeleteButton(lessonRow));

        // Добавляем строку в контейнер
        this.regularLessonsContainer.appendChild(lessonRow);
    }

    onSubmit(event) {
        event.preventDefault(); // Предотвращаем отправку формы

        // Собираем данные из формы
        const clientId = document.getElementById('client-id').value.trim();
        const clientNameElement = document.getElementById('client-name');
        if (!clientNameElement) {
            utils.showNotification('Необходимо выбрать клиента.', 'error');
            return;
        }
        const clientName = clientNameElement.textContent;
        const teacherId = document.getElementById('teacher-id').value.trim();

        if (!clientId || !clientName || !teacherId) {
            utils.showNotification('Пожалуйста, заполните поля "Client ID", "Client Name", "Teacher ID.', 'error');
            return; // Выходим из функции, если обязательные поля пустые
        }

        const oneTimeLessonRows = document.querySelectorAll('.one-time-lesson-row');
        const regularLessonRows = document.querySelectorAll('.regular-lesson-row');

        const oneTimeLessonsFilled = Array.from(oneTimeLessonRows).some(row => {
            const dateSelect = row.querySelector('.lesson-date-input').value;
            const timeSelect = row.querySelector('.time-select').value;
            const courseSelect = row.querySelector('.course-select').value;
            return dateSelect && timeSelect && courseSelect;
        });

        const regularScheduleFilled = Array.from(regularLessonRows).some(row => {
            const daySelect = row.querySelector('.day-select').value;
            const timeSelect = row.querySelector('.time-select').value;
            const courseSelect = row.querySelector('.course-select').value;
            return daySelect && timeSelect && courseSelect;
        });

        if (!oneTimeLessonsFilled && !regularScheduleFilled) {
            utils.showNotification('Для составления расписания должен быть заполнен хотя бы урок одного вида (одноразовый или постоянный).');
            return;
        }

        const oneTimeLessons = [];
        const regularSchedule = [];

        oneTimeLessonRows.forEach(row => {
            const dateSelect = row.querySelector('.lesson-date-input');
            const timeSelect = row.querySelector('.time-select');
            const courseSelect = row.querySelector('.course-select').value;

            if (dateSelect && timeSelect && courseSelect) {
                oneTimeLessons.push({
                    date: dateSelect.value,
                    time: timeSelect.value,
                    subject: courseSelect
                });
            }
        });

        regularLessonRows.forEach(row => {
            const daySelect = row.querySelector('.day-select');
            const timeSelect = row.querySelector('.time-select');
            const courseSelect = row.querySelector('.course-select').value;

            if (daySelect.value && timeSelect.value && courseSelect) {
                regularSchedule.push({
                    day: daySelect.value,
                    time: timeSelect.value,
                    subject: courseSelect
                });
            }
        });

        // Формируем объект с данными
        const studentData = {
            id: clientId,
            name: clientName,
            oneTimeLessons: oneTimeLessons,
            regularSchedule: regularSchedule
        };

        // Выводим данные в консоль для проверки
        console.log("Данные ученика:", studentData);

        utils.showConfirmationModal({
            text: "Вы уверены в добавлении нового расписания?",
            onConfirm: () => {
                calendar.addNewStudent(teacherId, studentData);
                this.close();
            },
            onCancel: () => {
            }
        });
    }
}


