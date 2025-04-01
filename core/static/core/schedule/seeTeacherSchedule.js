import {getOpenSlots, getTeachers} from "./repository.js";
import {calendarManager} from "./app.js";

export function openTeachersModal() {
    document.getElementById('teachers-button').addEventListener('click', async () => {
        try {
            const response = await getTeachers();
            let teachers = [];

            if (response?.results && Array.isArray(response.results)) {
                teachers = response.results;
            } else {
                console.warn('Unexpected response format, initializing empty teachers');
                teachers = [];
            }

            // Создаем модальное окно
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'block'; // Показываем сразу

            // Создаем контейнер для содержимого
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';

            // Создаем заголовок модального окна
            const modalHeader = document.createElement('div');
            modalHeader.className = 'modal-header';

            const title = document.createElement('h3');
            title.textContent = 'Список учителей';
            modalHeader.appendChild(title);

            // Кнопка закрытия (крестик)
            const closeBtn = document.createElement('span');
            closeBtn.className = 'close';
            closeBtn.innerHTML = '&times;';
            closeBtn.addEventListener('click', () => modal.remove());
            modalHeader.appendChild(closeBtn);

            // Тело модального окна
            const modalBody = document.createElement('div');
            modalBody.className = 'modal-body';

            console.log(teachers)
            if (teachers.length > 0) {
                const teachersList = document.createElement('div');
                teachersList.className = 'teachers-list';
                teachersList.style.display = 'grid';
                teachersList.style.gap = '12px';

                teachers.forEach(teacher => {
                    const teacherItem = document.createElement('div');
                    teacherItem.className = 'teacher-item';
                    teacherItem.style.display = 'flex';
                    teacherItem.style.justifyContent = 'space-between';
                    teacherItem.style.alignItems = 'center';
                    teacherItem.style.padding = '12px';
                    teacherItem.style.borderRadius = '8px';
                    teacherItem.style.backgroundColor = 'var(--header-bg)';
                    teacherItem.style.border = '1px solid var(--border-color)';

                    // Информация о учителе
                    const teacherInfo = document.createElement('div');
                    const name = document.createElement('strong');
                    let displayInfo = ''
                    if (teacher.name)
                        displayInfo = teacher.name;
                    else if (teacher.user_email)
                        displayInfo = `ID:${teacher.id} ${teacher.user_email}`;
                    else
                        displayInfo = `ID:${teacher.id} Без данных`;
                    name.textContent = displayInfo;
                    name.style.color = 'var(--text-primary)';

                    teacherInfo.appendChild(name);

                    if (teacher.education) {
                        const education = document.createElement('div');
                        education.textContent = teacher.education;
                        education.style.marginTop = '4px';
                        education.style.fontSize = '0.9em';
                        education.style.color = 'var(--text-secondary)';
                        teacherInfo.appendChild(education);
                    }
                    teacherItem.appendChild(teacherInfo);

                    // Кнопка "Посмотреть расписание"
                    const scheduleBtn = document.createElement('button');
                    scheduleBtn.className = 'submit-button';
                    scheduleBtn.textContent = 'Расписание';
                    scheduleBtn.dataset.teacherId = teacher.id;
                    scheduleBtn.style.padding = '8px 16px';
                    scheduleBtn.style.fontSize = '0.9em';
                    scheduleBtn.addEventListener('click', (e) => {
                        const teacherId = e.target.dataset.teacherId;
                        modal.remove();
                        showSchedulePanel(displayInfo)
                        showTeacherSchedule(teacherId);
                    });
                    teacherItem.appendChild(scheduleBtn);

                    teachersList.appendChild(teacherItem);
                });

                modalBody.appendChild(teachersList);
            } else {
                const emptyMessage = document.createElement('p');
                emptyMessage.textContent = 'Нет доступных учителей';
                emptyMessage.style.color = 'var(--text-secondary)';
                modalBody.appendChild(emptyMessage);
            }

            // Собираем модальное окно
            modalContent.appendChild(modalHeader);
            modalContent.appendChild(modalBody);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);

            // Закрытие по клику вне модального окна
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });

        } catch (error) {
            console.error('Error fetching teachers:', error);
            alert('Произошла ошибка при загрузке списка учителей');
        }
    });
}

function showTeacherSchedule(teacherId) {
    console.log(`Просмотр расписания для учителя с ID: ${teacherId}`);
    calendarManager.loadSchedule(teacherId)
}

function showSchedulePanel(teacherName = null) {
    const panel = document.getElementById('schedule-info-panel');
    const infoText = document.getElementById('schedule-info-text-name');

    // Устанавливаем имя учителя, если передано
    if (teacherName) {
        infoText.textContent = teacherName;
    }

    // Показываем панель
    panel.style.display = 'flex';

    // Добавляем обработчик для кнопки сворачивания/разворачивания
    document.getElementById('toggle-schedule-panel').addEventListener('click', toggleSchedulePanel);
}

// Функция для переключения состояния панели (свернуть/развернуть)
function toggleSchedulePanel() {
    const panel = document.getElementById('schedule-info-panel');
    panel.classList.toggle('collapsed');

    // Меняем title кнопки в зависимости от состояния
    const toggleBtn = document.getElementById('toggle-schedule-panel');
    toggleBtn.title = panel.classList.contains('collapsed') ? 'Развернуть' : 'Свернуть';
}