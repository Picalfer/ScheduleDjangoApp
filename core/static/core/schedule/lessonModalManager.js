import * as BX24API from './repository.js';
import {updateLessonBalance} from './repository.js'
import {showNotification} from "./utils.js";

export class LessonModalManager {
    constructor() {
        this.modal = document.getElementById("lesson-modal");
        this.closeButton = document.getElementsByClassName("close")[0];
        this.form = document.getElementById("lesson-form");
        this.cancelButton = this.modal.querySelector(".cancel-button");
        this.submitButton = this.modal.querySelector(".submit-button");

        this.studentId = null;

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
        BX24API.getClientByID(this.studentId).then(client => {
            if (client) {
                console.log("Отмечаем урок проведенным")
                let lessons_left = Number(client[AMOUNT_LESSONS_FIELD_ID]);
                console.log(lessons_left);
                if (!isNaN(lessons_left)) { // Проверяем, что это число
                    lessons_left -= 1; // Уменьшаем на 1
                } else {
                    console.error("Значение не является числом:", client.AMOUNT_LESSONS_FIELD_ID);
                }
                console.log("Измененный баланс " + lessons_left)
                updateLessonBalance(client.ID, lessons_left).then(r =>
                    showNotification("Урок отмечен", "success")
                    // TODO
                    /*отчетность - записать - кто провел когда и кому, сколько было и сколько стало
                    урок серый и все такое*/
                )
            } else {
                showNotification(`Клиент с ID ${this.studentId} не найден.`, 'error');
            }
        }).catch(error => {
            console.error("Ошибка получения данных о клиенте:", error);
            showNotification(`Клиент с ID ${this.studentId} не найден.`, 'error');
        });
    }

    close() {
        this.modal.style.display = "none";
        this.form.reset();
        this.studentId = null;
        // Убираем ошибки при закрытии
        this.topicInput.closest('.form-group').classList.remove('error');
    }

    open(lessonData) {
        this.studentId = lessonData.id
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