import {Modal} from './modal.js';
import {showNotification} from '../utils.js';

export class CancelLessonModal extends Modal {
    constructor(options) {
        const content = CancelLessonModal.generateContent();
        const footer = CancelLessonModal.generateFooter();

        super({
            modalId: 'cancel-lesson-modal',
            title: 'Отмена урока',
            subTitle: 'Обязательно согласовать с администратором',
            content,
            footer,
            size: 'small'
        });

        this.onConfirm = options.onConfirm;
        this.onCancel = options.onCancel;

        this.initElements();
        this.setupEventListeners();

        this.selectedSide = null;
        this.selectedReason = null;
        this.otherReasonText = '';
    }

    static generateContent() {
        return `
            <div class="cancel-options">
                <h3>По чьей причине отменяется урок?</h3>
                <div class="side-options">
                    <label class="option-card">
                        <input type="radio" name="cancel-side" value="teacher">
                        <div class="card-content">
                            <span class="icon">👨‍🏫</span>
                            <span class="text">Преподаватель</span>
                        </div>
                    </label>
                    <label class="option-card">
                        <input type="radio" name="cancel-side" value="student">
                        <div class="card-content">
                            <span class="icon">👨‍🎓</span>
                            <span class="text">Ученик</span>
                        </div>
                    </label>
                </div>
                
                <div class="reasons-section" style="display: none;">
                    <h3>Причина отмены</h3>
                    <div class="reason-options">
                        <select class="reason-select">
                            <option value="" disabled selected>Выберите причину</option>
                        </select>
                    </div>
                    <div class="other-reason-container" style="display: none; margin-top: 15px;">
                        <textarea class="other-reason-input" placeholder="Укажите причину отмены (минимум 5 символов)" rows="3"></textarea>
                        <div class="char-counter"><span class="current">0</span>/<span class="min">5</span> символов</div>
                    </div>
                </div>
            </div>
        `;
    }

    static generateFooter() {
        return `
            <button class="cancel-button">Закрыть</button>
            <button class="submit-button" disabled>Подтвердить отмену</button>
        `;
    }

    initElements() {
        this.sideOptions = this.modalElement.querySelectorAll('input[name="cancel-side"]');
        this.reasonsSection = this.modalElement.querySelector('.reasons-section');
        this.reasonSelect = this.modalElement.querySelector('.reason-select');
        this.otherReasonContainer = this.modalElement.querySelector('.other-reason-container');
        this.otherReasonInput = this.modalElement.querySelector('.other-reason-input');
        this.charCounter = this.modalElement.querySelector('.char-counter');
        this.currentCharCount = this.modalElement.querySelector('.char-counter .current');
        this.minCharCount = this.modalElement.querySelector('.char-counter .min');

        this.cancelButton = this.modalElement.querySelector('.cancel-button');
        this.submitButton = this.modalElement.querySelector('.submit-button');
    }

    setupEventListeners() {
        this.sideOptions.forEach(option => {
            option.addEventListener('change', (e) => {
                this.selectedSide = e.target.value;
                this.updateReasons();
                this.reasonsSection.style.display = 'block';
                this.checkFormValidity();
            });
        });

        this.reasonSelect.addEventListener('change', (e) => {
            this.selectedReason = e.target.value;
            this.otherReasonContainer.style.display = this.selectedReason === 'other' ? 'block' : 'none';
            this.checkFormValidity();
        });

        this.otherReasonInput.addEventListener('input', (e) => {
            this.otherReasonText = e.target.value;
            const count = this.otherReasonText.length;
            this.currentCharCount.textContent = count;

            // Меняем цвет счётчика если символов недостаточно
            if (count < 5) {
                this.charCounter.style.color = 'var(--danger-color)';
            } else {
                this.charCounter.style.color = 'var(--success-color)';
            }

            this.checkFormValidity();
        });

        this.submitButton.addEventListener('click', () => {
            if (!this.isFormValid()) {
                showNotification('Пожалуйста, заполните все обязательные поля', 'error');
                return;
            }

            const reasonData = {
                side: this.selectedSide,
                reason: this.selectedReason,
                reasonText: this.selectedReason === 'other' ? this.otherReasonText : null
            };

            if (this.onConfirm) {
                this.onConfirm(reasonData);
            }
            this.close();
        });

        this.cancelButton.addEventListener('click', () => {
            if (this.onCancel) {
                this.onCancel();
            }
            this.close();
        });
    }

    updateReasons() {
        this.reasonSelect.innerHTML = '<option value="" disabled selected>Выберите причину</option>';

        const reasons = this.selectedSide === 'teacher'
            ? [
                {value: 'illness', label: 'Болезнь преподавателя'},
                {value: 'emergency', label: 'Чрезвычайная ситуация'},
                {value: 'electricity', label: 'Отключение интернета/электричества'},
                {value: 'rest', label: 'Отгул'},
                {value: 'other', label: 'Другая причина'}
            ]
            : [
                {value: 'illness', label: 'Болезнь ученика'},
                {value: 'no_show', label: 'Ученик не явился'},
                {value: 'reschedule', label: 'Перенос урока'},
                {value: 'other', label: 'Другая причина'}
            ];

        reasons.forEach(reason => {
            const option = document.createElement('option');
            option.value = reason.value;
            option.textContent = reason.label;
            this.reasonSelect.appendChild(option);
        });

        this.selectedReason = null;
        this.otherReasonContainer.style.display = 'none';
        this.otherReasonInput.value = '';
        this.otherReasonText = '';
        this.currentCharCount.textContent = '0';
        this.charCounter.style.color = 'var(--danger-color)';
    }

    isFormValid() {
        if (!this.selectedSide || !this.selectedReason) return false;

        // Если выбрана "другая причина", проверяем длину текста
        if (this.selectedReason === 'other' && this.otherReasonText.length < 5) {
            return false;
        }

        return true;
    }

    checkFormValidity() {
        this.submitButton.disabled = !this.isFormValid();
    }

    close() {
        super.close();
        this.selectedSide = null;
        this.selectedReason = null;
        this.otherReasonText = '';
        this.reasonsSection.style.display = 'none';
        this.otherReasonContainer.style.display = 'none';
        this.sideOptions.forEach(option => option.checked = false);
        this.reasonSelect.innerHTML = '<option value="" disabled selected>Выберите причину</option>';
        this.otherReasonInput.value = '';
        this.currentCharCount.textContent = '0';
        this.charCounter.style.color = 'var(--danger-color)';
        this.submitButton.disabled = true;
    }
}