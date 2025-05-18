import {Modal} from './modal.js';
import {calendarManager, repository} from "../app.js";
import * as utils from '../utils.js';
import {showNotification} from '../utils.js';

export class LessonModal extends Modal {
    constructor() {
        // Сначала создаем статические данные, не требующие this
        const content = LessonModal.generateStaticContent();
        const footer = LessonModal.generateStaticFooter();
        const headerElements = LessonModal.createStaticAdminElements();

        // Затем вызываем super()
        super({
            modalId: 'lesson-modal',
            title: 'Информация об уроке',
            content,
            footer,
            headerElements,
        });

        // Теперь можно использовать this
        this.initElements();
        this.setupEventListeners();
    }

    // Статический метод для создания элементов админки
    static createStaticAdminElements() {
        const createAdminLink = (icon, title) => {
            const link = document.createElement('a');
            link.className = 'admin-link';
            link.innerHTML = icon;
            link.title = title;
            link.target = '_blank';
            return link;
        };

        const lessonBtn = createAdminLink('✏️', 'Открыть урок в админке');
        const studentBtn = createAdminLink('🎓', 'Открыть студента в админке');
        const clientBtn = createAdminLink('💼', 'Открыть клиента в админке');

        return [lessonBtn, studentBtn, clientBtn];
    }

    // Статический метод для генерации контента
    static generateStaticContent() {
        return `
            <div class="lesson-info">
                <p class="lesson-type"></p>
                <div class="platform-block">
                    <div class="platform-info">
                        <span class="platform-icon"></span>
                        <span class="platform-name"></span>
                    </div>
                    <button class="conference-btn" disabled>
                        <span class="btn-text">Запустить</span>
                    </button>
                </div>
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
                    <div class="input-group-with-btn">
                        <input type="text" id="lesson-topic" name="lesson-topic">
                        <button type="button" class="styled-button insert-prev-theme">Вставить прошлую тему</button>
                    </div>
                    <div class="previous-theme-hint" style="display: none;">
                        Прошлая тема: <span id="previous_theme_text"></span>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="lesson-homework">Домашнее задание</label>
                    <div class="input-group-with-btn">
                        <textarea id="lesson-homework" rows="3" name="lesson-homework"></textarea>
                        <button type="button" class="styled-button insert-prev-homework">Вставить прошлое ДЗ</button>
                    </div>
                    <div class="previous-homework-hint" style="display: none;">
                        Прошлое ДЗ: <span id="previous_homework_text"></span>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="lesson-comment">Комментарий</label>
                    <div class="input-group-with-btn">
                        <textarea id="lesson-comment" rows="3" name="lesson-comment"></textarea>
                        <button type="button" class="styled-button insert-prev-comment">Вставить прошлый комментарий</button>
                    </div>
                    <div class="previous-comment-hint" style="display: none;">
                        Прошлый комментарий: <span id="previous_comment_text"></span>
                    </div>
                </div>
            </form>
        `;
    }

    // Статический метод для генерации футера
    static generateStaticFooter() {
        return `
            <button class="cancel-button cancel-lesson-btn">Отменить урок</button>
            <button class="submit-button admit-lesson-btn">Отметить проведённым</button>
        `;
    }

    // Остальные методы остаются без изменений
    initElements() {
        this.lessonId = null;
        this.lessonData = null;
        this.form = this.modalElement.querySelector('#lesson-form');
        this.topicInput = this.modalElement.querySelector('#lesson-topic');
        this.cancelButton = this.modalElement.querySelector('.cancel-button');
        this.submitButton = this.modalElement.querySelector('.submit-button');
        this.lessonTypeElement = this.modalElement.querySelector('.lesson-type');
        this.lessonStudentElement = this.modalElement.querySelector('.lesson-student');

        this.platformIcon = this.modalElement.querySelector('.platform-icon');
        this.platformName = this.modalElement.querySelector('.platform-name');
        this.conferenceBtn = this.modalElement.querySelector('.conference-btn');

        this.insertPrevTopic = this.modalElement.querySelector('.insert-prev-theme');
        this.previousThemeHint = this.modalElement.querySelector('.previous-theme-hint');
        this.previousThemeText = this.modalElement.querySelector('#previous_theme_text');

        this.insertPrevHomework = this.modalElement.querySelector('.insert-prev-homework');
        this.previousHomeworkHint = this.modalElement.querySelector('.previous-homework-hint');
        this.previousHomeworkText = this.modalElement.querySelector('#previous_homework_text');

        this.insertPrevComment = this.modalElement.querySelector('.insert-prev-comment');
        this.previousCommentHint = this.modalElement.querySelector('.previous-comment-hint');
        this.previousCommentText = this.modalElement.querySelector('#previous_comment_text');

        const [adminButton, adminStudentButton, adminClientButton] = this.modalElement.querySelectorAll('.admin-link');
        this.adminButton = adminButton;
        this.adminStudentButton = adminStudentButton;
        this.adminClientButton = adminClientButton;
    }

    open(lessonData) {
        console.log(lessonData)

        this.lessonId = lessonData.id;
        this.lessonData = lessonData;

        this.setLessonData(lessonData);

        this.setFormState(lessonData);
        super.open();
    }

    setLessonData(lessonData) {
        this.setPreviousData(lessonData)
        if (userData.isAdmin) {
            // Кнопка урока
            this.adminButton.href = `/admin/core/lesson/${lessonData.id}/change/`;
            this.adminButton.style.display = 'inline-block';

            // Кнопка студента (если есть student_id в lessonData)
            if (lessonData.student) {
                this.adminStudentButton.href = `/admin/core/student/${lessonData.student}/change/`;
                this.adminStudentButton.style.display = 'inline-block';
            } else {
                this.adminStudentButton.style.display = 'none';
            }

            // Кнопка клиента (если есть client_id в lessonData)
            if (lessonData.client) {
                this.adminClientButton.href = `/admin/core/client/${lessonData.client}/change/`;
                this.adminClientButton.style.display = 'inline-block';
            } else {
                this.adminClientButton.style.display = 'none';
            }
        } else {
            // Скрываем все кнопки для не-админов
            this.adminButton.style.display = 'none';
            this.adminStudentButton.style.display = 'none';
            this.adminClientButton.style.display = 'none';
        }

        // Дата урока
        const dateElement = this.modalElement.querySelector('#lesson-date');
        dateElement.value = new Date(lessonData.date).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Курс
        this.modalElement.querySelector('#lesson-course').value = lessonData.course;

        // Тип урока
        const types = {
            recurring: ['🔄', 'Постоянный урок'],
            demo: ['🎯', 'Демо-урок'],
            single: ['1️⃣', 'Разовый урок']
        };

        const [emoji, text] = types[lessonData.lesson_type] || ['📅', 'Урок'];

        this.lessonTypeElement.innerHTML = `${emoji} ${text}`;

        // Тип платформы
        const platforms = {
            "google-meet": {
                icon: "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAACB0lEQVR4AWPAB0bBKHjlYmzzfRXPkT97mO+TjHcz3/69m6X//34GDrItf+Vs9vnHMt6Xv/ew/CcXAx0TT7blr5xN/39fwP+TQgfMJ9tysAPmCfynlgO0V4XymKwIWm6yIvi8yfIQB/yWIxzwlxoOMF8SJAO0+DQQ/wdh4xXB8/FZjnDAUr63lDrAaEWQBdDS51DLMR2wNTLf9axf2NdzfiH/0fGXFUKniUn1uBywb5PkWqCFv0GW4nSAU+vXeqfWL/+x4pbPocSkHXSLf+1h+dM9X/aVymSXSyAL6eqAz7vY/oRP0Pwv0WDxX3miyzO6OuD+Vq5f1p0GIMshDpjg9ItuDji3gf+9VqsJyGI4Vup3+k8XB+xZLXRDptEcZjH9HaAx3eMS0MKBcwDIUO3ZXs8lGwfQASCsO9/3i2SzJcIBE5z+0M0BMGy4JOCbTJsNNBc4v6anAxAWLAv8KNdt91llkst1gg6Qy75RrpBz/T8mvvHDYFbBNqCG/URgbHH9W3eB30aCDpBIu1wvmX7pPzasPyfrFUgD6RhhkcnKoHqyHaA3s/AP6RZjWmS6PCgcyP9OsgN0ZxSTaTmmRcarQm2QquXJdAwBBLBYHqAAihIQjeSAi/G4HGAwJ/sNJQ4wWR6cTTALKSTc5wBathqIf6M7wHBB0i0yLf8NxOsN1gcI4LN7FIwCACcjGypcbDtgAAAAAElFTkSuQmCC')",
                name: "Google Meet"
            },
            "zoom": {
                icon: "url('data:image/png;base64,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')",
                name: "Zoom"
            }
        };

        const platform = platforms[lessonData.platform];

        this.platformIcon.style.backgroundImage = platform.icon;
        this.platformName.textContent = platform.name;

        // Настройка кнопки
        if (lessonData.conference_link) {
            this.conferenceBtn.disabled = false;
            this.conferenceBtn.onclick = () => window.open(lessonData.conference_link, '_blank');
        } else {
            this.conferenceBtn.disabled = true;
            this.conferenceBtn.onclick = null;
        }

        // Ученик
        this.lessonStudentElement.textContent = `Ученик: ${lessonData.student_name || lessonData.student}`;

        // Заполняем поля формы
        this.modalElement.querySelector('#lesson-topic').value = lessonData.lesson_topic || '';
        this.modalElement.querySelector('#lesson-homework').value = lessonData.homework || '';
        this.modalElement.querySelector('#lesson-comment').value = lessonData.lesson_notes || '';
    }

    setPreviousData(lessonData) {
        if (lessonData.status === "scheduled") {
            // Тема
            this.previousThemeHint.style.display = 'block';
            this.insertPrevTopic.style.display = 'block';
            this.previousThemeText.textContent = lessonData.previous_topic || 'Нет данных';

            // Домашнее задание
            this.previousHomeworkHint.style.display = 'block';
            this.insertPrevHomework.style.display = 'block';
            this.previousHomeworkText.textContent = lessonData.previous_homework || 'Нет данных';

            // Комментарий
            this.previousCommentHint.style.display = 'block';
            this.insertPrevComment.style.display = 'block';
            this.previousCommentText.textContent = lessonData.previous_comment || 'Нет данных';
        } else {
            // Тема
            this.previousThemeHint.style.display = 'none';
            this.insertPrevTopic.style.display = 'none';

            // Домашнее задание
            this.previousHomeworkHint.style.display = 'none';
            this.insertPrevHomework.style.display = 'none';

            // Комментарий
            this.previousCommentHint.style.display = 'none';
            this.insertPrevComment.style.display = 'none';
        }
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

        function setupInsertButton(buttonId, textElementId, inputId, errorMessage) {
            const button = document.querySelector(buttonId);
            button.addEventListener('click', function () {
                const previousText = document.querySelector(textElementId).textContent;
                const input = document.querySelector(inputId);

                input.focus();

                if (previousText === "Нет данных") {
                    showNotification(errorMessage);
                    return;
                }

                input.value = previousText;
            });
        }

        // Инициализация всех кнопок
        setupInsertButton(
            '.insert-prev-theme',
            '#previous_theme_text',
            '#lesson-topic',
            "Нет данных по предыдущей теме"
        );

        setupInsertButton(
            '.insert-prev-homework',
            '#previous_homework_text',
            '#lesson-homework',
            "Нет данных по предыдущему домашнему заданию"
        );

        setupInsertButton(
            '.insert-prev-comment',
            '#previous_comment_text',
            '#lesson-comment',
            "Нет данных по предыдущему комментарию"
        );
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