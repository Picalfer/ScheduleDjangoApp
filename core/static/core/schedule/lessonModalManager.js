import {showNotification} from "./utils.js";
import {completeLesson} from "./repository.js";
import {calendarManager} from "./app.js";

export class LessonModalManager {
    constructor() {
        this.modal = document.getElementById("lesson-modal");
        this.closeButton = document.getElementsByClassName("close")[0];
        this.form = document.getElementById("lesson-form");
        this.cancelButton = this.modal.querySelector(".cancel-button");
        this.submitButton = this.modal.querySelector(".submit-button");

        this.lessonId = null;

        // дополнительные поля для сброса перед закрытием модального окна
        this.topicInput = document.getElementById("lesson-topic");

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.closeButton.onclick = () => this.close();
        this.cancelButton.onclick = () => this.close();

        document.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        this.submitButton.onclick = (e) => {
            e.preventDefault();
            if (this.validateForm()) {
                this.admitLesson()
                this.close();
            }
        };

        this.topicInput.addEventListener('input', () => {
            const topicGroup = this.topicInput.closest('.form-group');
            if (this.topicInput.value.trim()) {
                topicGroup.classList.remove('error');
            }
        });
    }

    admitLesson() {
        const currentLessonId = this.lessonId;

        // Собираем данные, преобразуя пустые строки в null
        const getValue = (id) => {
            const val = document.getElementById(id).value.trim();
            return val === '' ? null : val;
        };

        const lessonData = {
            topic: getValue('lesson-topic'),
            notes: getValue('lesson-comment'),
            homework: getValue('lesson-homework')
        };

        // Остальной код остаётся без изменений
        const confirmationMessage = `Вы уверены, что хотите отметить урок как проведенный?\n\n` +
            `Тема: ${lessonData.topic || 'не указана'}\n` +
            `Комментарий: ${lessonData.notes || 'нет'}\n` +
            `ДЗ: ${lessonData.homework || 'не задано'}\n\n` +
            `Баланс студента уменьшится на 1.`;

        if (!confirm(confirmationMessage)) {
            return;
        }

        completeLesson(currentLessonId, lessonData)
            .then(response => {
                showNotification(
                    `Урок проведен! Осталось уроков: ${response.remaining_balance}`,
                    "success"
                );
                calendarManager.loadSchedule();
            })
            .catch(error => {
                console.error("Ошибка при проведении урока:", error);
                showNotification(
                    error.message || "Произошла ошибка при проведении урока",
                    "error"
                );
            });
    }

    markLessonAsCompleted(responseData, id) {
        console.log("test")
        console.log(this.lessonId)
        console.log(id)
        // 1. Находим элемент урока
        const lessonElement = document.querySelector(`[data-lesson-id="${id}"]`);

        // 2. Добавляем класс completed
        if (lessonElement) {
            console.log("test2")
            lessonElement.classList.add('completed');

            // 3. Удаляем кнопку (если есть)
            const completeBtn = lessonElement.querySelector('.complete-btn');
            if (completeBtn) {
                completeBtn.remove();
            }

            // 4. Добавляем статус (опционально)
            const statusBadge = document.createElement('span');
            statusBadge.className = 'lesson-status';
            statusBadge.textContent = '✓ Проведен';
            lessonElement.appendChild(statusBadge);
        }

        // 5. Обновляем баланс (если есть такой элемент)
        const balanceElement = document.getElementById('student-balance');
        if (balanceElement) {
            balanceElement.textContent = responseData.remaining_balance;
        }
    }

    close() {
        this.modal.style.display = "none";
        this.form.reset();
        this.lessonId = null;
        // Убираем ошибки при закрытии
        this.topicInput.closest('.form-group').classList.remove('error');
    }

    open(lessonData) {
        this.lessonId = lessonData.id;
        this.modal.style.display = 'block';
        this.modal.querySelector('.modal-content').scrollTop = 0;

        console.log(lessonData)

        // Добавляем класс типа урока к модальному окну
        const modalContent = this.modal.querySelector('.modal-content');
        modalContent.classList.remove('permanent', 'one-time');
        modalContent.classList.add(lessonData.status);

        // Проверяем статус урока (только для блокировки полей)
        const shouldDisable = ['completed', 'canceled'].includes(lessonData.status.toLowerCase());

        // Блокируем поля только если нужно
        const fields = [
            "lesson-date",
            "lesson-course",
            "lesson-topic",
            "lesson-homework",
            "lesson-comment"
        ];

        fields.forEach(id => {
            const field = document.getElementById(id);
            if (field) field.disabled = shouldDisable;
        });

        this.submitButton.disabled = shouldDisable;
        this.cancelButton.disabled = shouldDisable;

        // Остальной код остается БЕЗ ИЗМЕНЕНИЙ
        const today = new Date();
        document.getElementById("lesson-date").value = today.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        document.getElementById("lesson-course").value = lessonData.subject;

        const emoji = lessonData.is_recurring ? '🔄' : '1️⃣';
        const statusText = lessonData.is_recurring ? 'Постоянный урок' : 'Разовый урок';
        this.modal.querySelector('.lesson-type').innerHTML = `${emoji} ${statusText}`;
        this.modal.querySelector('.lesson-student').textContent = `Ученик: ${lessonData.student_name || lessonData.student}`;

        document.getElementById("lesson-topic").value = lessonData.lesson_topic;
        document.getElementById("lesson-homework").value = lessonData.homework;
        document.getElementById("lesson-comment").value = lessonData.lesson_notes;
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
}