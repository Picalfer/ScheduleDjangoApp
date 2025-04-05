import {Modal} from './modal.js';
import {calendarManager, repository} from '../app.js';

export class TeachersModal extends Modal {
    constructor(options = {}) {
        super({
            title: 'Список учителей',
            modalClass: 'teachers-modal',
            ...options
        });

        this.initTeachersContent();
        this.setupTeachersEvents();
    }

    async initTeachersContent() {
        try {
            const response = await repository.getTeachers();
            this.teachers = response?.results || [];
            console.log(this.teachers)

            if (this.teachers.length === 0) {
                this.updateContent('<p class="no-teachers">Нет доступных учителей</p>');
                return;
            }

            this.displayTeachersList();
        } catch (error) {
            console.error('Error fetching teachers:', error);
            this.updateContent(`
        <div class="teachers-error">
          <p>Ошибка загрузки списка учителей</p>
          <button class="submit-button" id="retry-teachers-btn">
            Попробовать снова
          </button>
        </div>
      `);
        }
    }

    displayTeachersList() {
        const teachersHTML = this.teachers.map(teacher => {
            const displayInfo = teacher.name ||
                `ID:${teacher.id} ${teacher.user_email || 'Без данных'}`;

            return `
        <div class="teacher-item">
          <div class="teacher-info">
            <strong>${displayInfo}</strong>
            ${teacher.education ? `<div class="teacher-education">${teacher.education}</div>` : ''}
          </div>
          <button class="submit-button teacher-schedule-btn" 
                  data-teacher-id="${teacher.id}"
                  data-teacher-name="${displayInfo}">
            Расписание
          </button>
        </div>
      `;
        }).join('');

        this.updateContent(`
      <div class="teachers-list">
        ${teachersHTML}
      </div>
    `);
    }

    setupTeachersEvents() {
        this.modalElement.addEventListener('click', (e) => {
            // Обработка кнопки "Расписание"
            if (e.target.classList.contains('teacher-schedule-btn')) {
                const teacherId = e.target.dataset.teacherId;
                const teacherName = e.target.dataset.teacherName;
                this.close();
                this.showTeacherSchedule(teacherId);
                this.showSchedulePanel(teacherName);
            }

            // Повторная попытка загрузки
            if (e.target.id === 'retry-teachers-btn') {
                this.initTeachersContent();
            }
        });
    }

    showTeacherSchedule(teacherId) {
        console.log(`Просмотр расписания для учителя с ID: ${teacherId}`);
        calendarManager.loadSchedule(teacherId);
    }

    showSchedulePanel(teacherName) {
        const panel = document.getElementById('schedule-info-panel');
        const infoText = document.getElementById('schedule-info-text-name');

        if (panel && infoText) {
            infoText.textContent = teacherName;
            panel.style.display = 'flex';

            const toggleBtn = document.getElementById('toggle-schedule-panel');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', this.toggleSchedulePanel);
            }
        }
    }

    toggleSchedulePanel() {
        const panel = document.getElementById('schedule-info-panel');
        if (panel) {
            panel.classList.toggle('collapsed');

            const toggleBtn = document.getElementById('toggle-schedule-panel');
            if (toggleBtn) {
                toggleBtn.title = panel.classList.contains('collapsed') ? 'Развернуть' : 'Свернуть';
            }
        }
    }
}