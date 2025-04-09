import {Modal} from './modal.js';
import {calendarManager, repository} from "../app.js";
import * as utils from '../utils.js';
import {showNotification} from '../utils.js';

export class LessonModal extends Modal {
    constructor() {
        super({
            modalId: 'lesson-modal',
            title: 'Информация об уроке',
            content: `
        <div class="lesson-info">
          <p class="lesson-type"></p>
          <p class="lesson-student"></p>
        </div>
        <form id="lesson-form">
          <div class="form-group">
            <label for="lesson-date">Дата</label>
            <input type="text" id="lesson-date" readonly>
          </div>
          <div class="form-group">
            <label for="lesson-course">Курс</label>
            <input type="text" id="lesson-course" readonly>
          </div>
          <div class="form-group">
            <label for="lesson-topic">Тема урока <span class="required">*</span></label>
            <input type="text" id="lesson-topic" required>
            <div class="error-message">Это поле обязательно для заполнения</div>
          </div>
          <div class="form-group">
            <label for="lesson-homework">Домашнее задание</label>
            <textarea id="lesson-homework" rows="3"></textarea>
          </div>
          <div class="form-group">
            <label for="lesson-comment">Комментарий</label>
            <textarea id="lesson-comment" rows="3"></textarea>
          </div>
        </form>
      `,
            footer: `
        <button class="cancel-button cancel-lesson-btn">Отменить урок</button>
        <button class="submit-button admit-lesson-btn">Отметить проведённым</button>
      `
        });

        this.lessonId = null;
        this.lessonData = null;
        this.form = this.modalElement.querySelector('#lesson-form');
        this.topicInput = this.modalElement.querySelector('#lesson-topic');
        this.cancelButton = this.modalElement.querySelector('.cancel-button');
        this.submitButton = this.modalElement.querySelector('.submit-button');
        this.lessonTypeElement = this.modalElement.querySelector('.lesson-type');
        this.lessonStudentElement = this.modalElement.querySelector('.lesson-student');

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Наследуем базовые обработчики закрытия
        //super.setupEventListeners();

        // Специфичные обработчики
        this.cancelButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.cancelLesson();
        });

        this.submitButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.validateForm()) {
                this.admitLesson();
            }
        });

        this.topicInput.addEventListener('input', () => {
            const topicGroup = this.topicInput.closest('.form-group');
            if (this.topicInput.value.trim()) {
                topicGroup.classList.remove('error');
            }
        });
    }

    open(lessonData) {
        this.lessonId = lessonData.id;
        this.lessonData = lessonData;
        console.log(`Открыт урок под id: ${this.lessonId}`);

        // Устанавливаем данные урока
        this.setLessonData(lessonData);

        // Настраиваем состояние формы
        this.setFormState(lessonData);

        // Показываем модальное окно
        super.open();
    }

    setLessonData(lessonData) {
        // Дата урока
        const dateElement = this.modalElement.querySelector('#lesson-date');
        dateElement.value = new Date(lessonData.date).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Курс
        this.modalElement.querySelector('#lesson-course').value = lessonData.course;

        const types = {
            recurring: ['🔄', 'Постоянный урок'],
            demo: ['🎯', 'Демо-урок'],
            single: ['1️⃣', 'Разовый урок']
        };

        // Тип урока
        const [emoji, text] = types[lessonData.lesson_type] || ['📅', 'Урок'];

        this.lessonTypeElement.innerHTML = `${emoji} ${text}`;

        // Ученик
        this.lessonStudentElement.textContent = `Ученик: ${lessonData.student_name || lessonData.student}`;

        // Заполняем поля формы
        this.modalElement.querySelector('#lesson-topic').value = lessonData.lesson_topic || '';
        this.modalElement.querySelector('#lesson-homework').value = lessonData.homework || '';
        this.modalElement.querySelector('#lesson-comment').value = lessonData.lesson_notes || '';
    }

    setFormState(lessonData) {
        const isCompletedOrCanceled = ['completed', 'canceled'].includes(lessonData.status.toLowerCase());
        const fields = ['lesson-date', 'lesson-course', 'lesson-topic', 'lesson-homework', 'lesson-comment'];

        // Блокировка полей
        fields.forEach(id => {
            const field = this.modalElement.querySelector(`#${id}`);
            if (field) field.disabled = isCompletedOrCanceled;
        });

        // Блокировка кнопок
        this.submitButton.disabled = isCompletedOrCanceled;
        this.cancelButton.disabled = isCompletedOrCanceled;

        // Добавляем класс типа урока
        const modalContent = this.modalElement.querySelector('.modal-content');
        modalContent.classList.remove('permanent', 'one-time', 'completed', 'canceled');
        modalContent.classList.add(lessonData.status.toLowerCase());
    }

    async admitLesson() {
        const getValue = (id) => {
            const val = this.modalElement.querySelector(`#${id}`).value.trim();
            return val === '' ? null : val;
        };

        const lessonData = {
            topic: getValue('lesson-topic'),
            notes: getValue('lesson-comment'),
            homework: getValue('lesson-homework')
        };

        const confirmationMessage = `Вы уверены, что хотите отметить урок как проведенный?\n\n` +
            `Тема: ${lessonData.topic || 'не указана'}\n` +
            `Комментарий: ${lessonData.notes || 'нет'}\n` +
            `ДЗ: ${lessonData.homework || 'не задано'}` +
            (this.lessonData.lesson_type !== 'demo' ? `\n\nБаланс студента уменьшится на 1.` : '');

        if (!confirm(confirmationMessage)) {
            return;
        }

        try {
            const response = await repository.completeLesson(this.lessonId, lessonData);
            if (this.lessonData.lesson_type !== 'demo') {
                showNotification(
                    `Урок проведен! Осталось уроков: ${response.remaining_balance}`,
                    "success"
                );
            } else {
                showNotification(
                    `Демо урок проведен!`,
                    "success"
                );
            }

            calendarManager.loadSchedule();
            this.close();
        } catch (error) {
            console.error("Ошибка при проведении урока:", error);
            showNotification(
                error.message || "Произошла ошибка при проведении урока",
                "error"
            );
        }
    }

    cancelLesson() {
        utils.showConfirmationModal({
            text: "Введите причину отмены:",
            inputConfig: {
                type: 'textarea',
                placeholder: 'Минимум 5 символов',
                required: true
            },
            onConfirm: async (reason) => {
                try {
                    await repository.cancelLesson(this.lessonId, reason);
                    showNotification(`Урок отменен!`, "success");
                    calendarManager.loadSchedule();
                    this.close();
                } catch (error) {
                    console.error("Ошибка при отмене урока:", error);
                    showNotification(
                        error.message || "Произошла ошибка при отмене урока",
                        "error"
                    );
                }
            }
        });
    }

    validateForm() {
        let isValid = true;
        const topicGroup = this.topicInput.closest('.form-group');

        if (!this.topicInput.value.trim()) {
            topicGroup.classList.add('error');
            isValid = false;
        } else {
            topicGroup.classList.remove('error');
        }

        return isValid;
    }

    close() {
        super.close();
        this.form.reset();
        this.topicInput.closest('.form-group').classList.remove('error');
    }
}