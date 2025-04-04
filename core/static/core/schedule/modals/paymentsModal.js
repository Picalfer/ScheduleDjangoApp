import {Modal} from './modal.js';
import {formatDate} from "../utils.js";
import {repository} from "../../home.js";

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
            <button class="generate-payments-btn" id="generate-payments-btn">
                Сгенерировать выплаты
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

            if (e.target.id === 'generate-payments-btn') {
                await this.generatePayments();
            }

            if (e.target.classList.contains('export-payments-btn')) {
                this.exportPayments();
            }
        });
    }

    async generatePayments() {
        const btn = this.modalElement.querySelector('#generate-payments-btn');
        try {
            btn.disabled = true;
            btn.textContent = 'Генерация...';

            const response = await fetch('/generate-payments/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': repository.csrfToken,
                },
                credentials: 'include'
            });

            const data = await response.json();

            if (data.status === 'success') {
                showNotification("Выплаты успешно сгенерированы", "success");
                await this.loadPaymentsData(); // Автоматически загружаем обновленные данные
            } else {
                throw new Error(data.message || 'Ошибка генерации выплат');
            }
        } catch (error) {
            showNotification(error.message, "error");
            console.error('Ошибка генерации выплат:', error);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Сгенерировать выплаты';
        }
    }

    async loadPaymentsData() {
        const btn = this.modalElement.querySelector('#load-payments-btn');
        const generateBtn = this.modalElement.querySelector('#generate-payments-btn');
        try {
            btn.disabled = true;
            if (generateBtn) generateBtn.disabled = true;
            btn.textContent = 'Загрузка...';

            const response = await fetch('/payments/');
            const data = await response.json();

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
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Посмотреть выплаты';
            }
            if (generateBtn) generateBtn.disabled = false;
        }
    }

    displayPayments(payments) {
        console.log(payments)
        if (!payments || payments.length === 0) {
            this.updateContent('<p class="no-payments">Нет данных о выплатах</p>');
            return;
        }

        const paymentsHTML = payments.map(payment => `
      <div class="form-group payment-item" data-payment-id="${payment.id}">
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
        <div class="payment-row">
            <span>
                Сумма ${payment.amount} ${payment.currency}
            </span>
            <span>
            <button class="pay-btn" ${payment.is_paid ? 'disabled' : ''} data-payment-id="${payment.id}">
                        ${payment.is_paid ? '✓ Оплачено' : 'Оплатить'}
            </button>
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
        this.setupPaymentButtons();
    }

    setupPaymentButtons() {
        document.querySelectorAll('.pay-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const paymentId = e.target.dataset.paymentId;
                await this.processPayment(paymentId);
            });
        });
    }

    async processPayment(paymentId) {
        // Находим кнопку по ID платежа
        const btn = document.querySelector(`button.pay-btn[data-payment-id="${paymentId}"]`);
        const payment = document.querySelector(`div.payment-item[data-payment-id="${paymentId}"]`);

        if (!payment) {
            console.error(`Платёж ${paymentId} не найден на экране`);
            return;
        }

        if (btn.disabled) {
            console.warn(`Платёж ${paymentId} уже обработан`);
            return;
        }

        if (!confirm('Вы уверены, что хотите провести оплату?')) {
            return;
        }

        try {
            // Блокируем кнопку
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span> Обработка...';

            // Отправляем запрос
            const response = await fetch(`/api/payments/${paymentId}/pay/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': repository.csrfToken,
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                console.log("успех")
                // Обновляем кнопку
                btn.disabled = true;
                btn.innerHTML = '✓ Оплачено';
                btn.classList.add('paid');

                // Обновляем статус в интерфейсе
                const statusElement = payment.querySelector('.payment-status');
                if (statusElement) {
                    console.log("найдено")
                    statusElement.textContent = 'Оплачено';
                    statusElement.className = 'payment-status paid';
                } else {
                    console.log("Элементы не найдены, но платеж проведен")
                }

                showNotification('Платёж успешно проведён', 'success');
            } else {
                throw new Error(result.message || 'Неизвестная ошибка оплаты');
            }
        } catch (error) {
            console.error('Ошибка оплаты:', error);
            btn.disabled = false;
            btn.textContent = 'Оплатить';
            showNotification(error.message, 'error');
        }
    }

    exportPayments() {
        console.log('Экспорт данных о выплатах...');
        // Реализация экспорта
    }
}