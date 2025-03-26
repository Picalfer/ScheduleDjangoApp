import {showNotification} from "./utils.js";
import {completeLesson} from "./repository.js";

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
        // 1. Подтверждение действия
        if (!confirm("Вы уверены, что хотите отметить урок как проведенный? Баланс студента уменьшится на 1.")) {
            return;
        }

        // 2. Вызов функции completeLesson
        completeLesson(this.lessonId)
            .then(response => {
                // 3. Обработка успешного ответа
                showNotification(
                    `Урок проведен! Осталось уроков: ${response.remaining_balance}`,
                    "success"
                );

                // 4. Обновление UI
                this.markLessonAsCompleted(response);

                // 5. Логирование (опционально)
                console.log('Lesson completed:', {
                    lessonId: this.lessonId,
                    studentId: this.lessonId,
                    newBalance: response.remaining_balance,
                    logId: response.log_id
                });
            })
            .catch(error => {
                // 6. Обработка ошибок
                console.error("Ошибка при проведении урока:", error);
                showNotification(
                    error.message || "Произошла ошибка при проведении урока",
                    "error"
                );
            });
    }

    markLessonAsCompleted(responseData) {
        // 1. Находим элемент урока
        const lessonElement = document.querySelector(`[data-lesson-id="${this.lessonId}"]`);

        // 2. Добавляем класс completed
        if (lessonElement) {
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
        this.lessonId = lessonData.id
        this.modal.style.display = 'block';
        this.modal.querySelector('.modal-content').scrollTop = 0;

        // Добавляем класс типа урока к модальному окну
        const modalContent = this.modal.querySelector('.modal-content');
        modalContent.classList.remove('permanent', 'one-time');
        modalContent.classList.add(lessonData.status);

        // Форматируем сегодняшнюю дату
        const today = new Date();
        // Заполняем форму данными урока
        document.getElementById("lesson-date").value = today.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        document.getElementById("lesson-course").value = lessonData.subject;

        // Очищаем поля ввода
        document.getElementById("lesson-topic").value = "";
        document.getElementById("lesson-homework").value = "";
        document.getElementById("lesson-comment").value = "";

        // Добавляем информацию об уроке
        const emoji = lessonData.status === 'permanent' ? '🔄' : '1️⃣';
        const statusText = lessonData.status === 'permanent' ? 'Постоянный урок' : 'Разовый урок';
        this.modal.querySelector('.lesson-type').innerHTML = `${emoji} ${statusText}`;
        this.modal.querySelector('.lesson-student').textContent = `Ученик: ${lessonData.student}`;
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