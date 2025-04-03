import {Modal} from './modal.js';
import {formatDate} from "../utils.js";

export class PaymentsModal extends Modal {
    constructor(options = {}) {
        super({
            title: 'Выплаты преподавателям',
            modalClass: 'payments-modal',
            ...options
        });

        this.initPaymentsContent();
        this.setupPaymentsEvents();
    }

    initPaymentsContent() {
        const initialContent = `
      <div class="payments-init-content">
        <button class="submit-button" id="load-payments-btn">
          Посмотреть выплаты
        </button>
      </div>
    `;

        this.updateContent(initialContent);
    }

    setupPaymentsEvents() {
        this.modalElement.addEventListener('click', async (e) => {
            if (e.target.id === 'load-payments-btn') {
                await this.loadPaymentsData();
            }

            if (e.target.classList.contains('export-payments-btn')) {
                this.exportPayments();
            }
        });
    }

    async loadPaymentsData() {
        const btn = this.modalElement.querySelector('#load-payments-btn');
        try {
            btn.disabled = true;
            btn.textContent = 'Загрузка...';

            const response = await fetch('/payments/');
            const data = await response.json();
            console.log(data)

            if (data.status === 'success') {
                this.displayPayments(data.payments);
            } else {
                throw new Error(data.message || 'Ошибка загрузки данных');
            }
        } catch (error) {
            this.updateContent(`
        <div class="payments-error">
          <p>Ошибка: ${error.message}</p>
          <button class="submit-button" id="retry-payments-btn">
            Попробовать снова
          </button>
        </div>
      `);
        }
    }

    displayPayments(payments) {
        if (!payments || payments.length === 0) {
            this.updateContent('<p class="no-payments">Нет данных о выплатах</p>');
            return;
        }


        const paymentsHTML = payments.map(payment => `
      <div class="form-group">
        <div class="payment-row">
          <span class="payment-label">Преподаватель:</span>
          <span class="payment-value">${payment.teacher}</span>
        </div>
        <div class="payment-row">
          <span class="payment-label">Период:</span>
          <span class="payment-value">${formatDate(new Date(payment.week_start))} - ${formatDate(new Date(payment.week_end))}</span>
        </div>
        <div class="payment-row">
          <span class="payment-label">Уроков:</span>
          <span class="payment-value">${payment.lessons}</span>
        </div>
        <div class="payment-row">
          <span class="payment-label">Сумма:</span>
          <span class="payment-value">${payment.amount} руб.</span>
        </div>
        <div class="payment-row">
          <span class="payment-label">Статус:</span>
          <span class="payment-status ${payment.is_paid ? 'paid' : 'unpaid'}">
            ${payment.is_paid ? 'Оплачено' : 'Не оплачено'}
          </span>
        </div>
        <div class="payment-row"><span>
            Сумма ${payment.amount} ${payment.currency}
          </span>
        </div>
        <hr class="payment-divider">
      </div>
    `).join('');

        this.updateContent(`
      <div class="payments-list">
        ${paymentsHTML}
      </div>
    `);

        // Обновляем футер
        const footer = this.modalElement.querySelector('.modal-footer');
        footer.innerHTML = `
      <button class="cancel-button">Закрыть</button>
      <button class="submit-button export-payments-btn">Экспорт</button>
    `;
    }

    exportPayments() {
        console.log('Экспорт данных о выплатах...');
        // Реализация экспорта
    }
}