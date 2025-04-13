import {Modal} from './modal.js';
import {formatDate} from "../utils.js";
import {repository} from "../app.js";

export class BalanceAlertModal extends Modal {
    constructor(options = {}) {
        super({
            title: 'Клиенты с низким балансом',
            modalClass: 'balance-alert-modal',
            modalContentClass: 'balance-alert-modal-content',
            ...options
        });

        this.loadClientsData();
        this.setupEvents();
    }

    setupEvents() {
        this.modalElement.addEventListener('click', (e) => {
            if (e.target.classList.contains('contact-btn')) {
                this.handleContactClient(e.target.dataset.clientId);
            }
        });
    }

    async loadClientsData() {
        try {
            const data = await repository.loadLowBalanceClients();

            if (data && data.clients) {
                this.displayClients(data.clients);
            } else {
                console.error('Не удалось загрузить данные клиентов');
            }
        } catch (error) {
            console.error('Ошибка при загрузке клиентов:', error);
        }
    }

    displayClients(clients) {
        // Группируем клиентов по балансу
        const zeroBalance = clients.filter(c => c.balance === 0);
        const lowBalance = clients.filter(c => c.balance === 1);
        const warningBalance = clients.filter(c => c.balance === 2);

        const sections = [
            {
                title: '🔴 Нулевой баланс',
                clients: zeroBalance,
                className: 'zero-balance'
            },
            {
                title: '🟠 Остался 1 урок',
                clients: lowBalance,
                className: 'low-balance'
            },
            {
                title: '🟡 Осталось 2 урока',
                clients: warningBalance,
                className: 'warning-balance'
            }
        ];

        const sectionsHTML = sections.map(section => `
            <div class="balance-section ${section.className}">
                <h3>${section.title} (${section.clients.length})</h3>
                ${section.clients.length > 0
            ? this.renderClientsList(section.clients)
            : '<p class="no-clients">Нет клиентов в этой категории</p>'
        }
            </div>
        `).join('');

        this.updateContent(`
            <div class="balance-alert-container horizontal-layout">
                ${sectionsHTML}
            </div>
        `);
    }

    renderClientsList(clients) {
        return clients.map(client => `
            <div class="client-card" data-client-id="${client.id}">
                <div class="client-info">
                    <h4>${client.name}</h4>
                    <div class="client-details">
                        <p>Телефон: ${client.parent_phone}</p>
                        <p>Последняя оплата: ${client.last_payment_date ? formatDate(new Date(client.last_payment_date)) : 'нет данных'}</p>
                        <p>Следующий урок: ${client.next_lesson_date ? formatDate(new Date(client.next_lesson_date)) : 'не запланирован'}</p>
                    </div>
                </div>
                <div class="client-actions">
                    <button class="contact-btn" data-client-id="${client.id}">
                        Связаться
                    </button>
                </div>
            </div>
        `).join('');
    }

    handleContactClient(clientId) {
        // Заглушка для обработки контакта с клиентом
        console.log(`Контактируем с клиентом ID: ${clientId}`);
        showNotification(`Отправлено уведомление родителю клиента ${clientId}`, 'success');

        // Здесь будет реальная логика связи:
        // 1. Можно открыть форму email/sms
        // 2. Или автоматически отправлять напоминание
    }
}