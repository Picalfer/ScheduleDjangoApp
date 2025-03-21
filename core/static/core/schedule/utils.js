export function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');

    // Устанавливаем соответствующий стиль в зависимости от типа
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#4CAF50'; // Зеленый цвет для успеха
            notification.style.color = '#fff'; // Белый текст
            break;
        case 'error':
            notification.style.backgroundColor = '#f44336'; // Красный цвет для ошибки
            notification.style.color = '#fff'; // Белый текст
            break;
        case 'info':
        default:
            notification.style.backgroundColor = '#2196F3'; // Синий цвет для нейтрального
            notification.style.color = '#fff'; // Белый текст
            break;
    }

    // Показать уведомление
    notification.textContent = message;
    notification.style.display = 'block';
    notification.style.opacity = '1';
    notification.style.zIndex = '1001';
    notification.style.transform = 'translateX(-50%) translateY(0)';

    // Скрыть уведомление через 3 секунды
    setTimeout(() => {
        notification.style.opacity = '0'; // Скрыть уведомление
        notification.style.transform = 'translateX(-50%) translateY(20px)'; // Убрать уведомление вниз
        setTimeout(() => {
            notification.style.display = 'none'; // Убрать из потока
        }, 500); // Время, чтобы дождаться завершения анимации
    }, 3000);
}

export function showConfirmationModal({text, onConfirm, onCancel}) {
    const confirmationModal = document.getElementById('confirmation-modal');
    if (confirmationModal) {
        const confirmationText = document.getElementById('confirmation-text');
        confirmationText.innerHTML = text;
        confirmationModal.style.display = 'block';
        confirmationModal.style.zIndex = '10001';

        const confirmButton = document.getElementById('confirm-change');
        if (confirmButton) {
            confirmButton.onclick = () => {
                onConfirm();
                this.closeConfirmationModal();
            };
        }

        const cancelButton = document.getElementById('cancel-change');
        if (cancelButton) {
            cancelButton.onclick = () => {
                onCancel();
                this.closeConfirmationModal();
            };
        }
    }
}

export function closeConfirmationModal() {
    const confirmationModal = document.getElementById('confirmation-modal');
    if (confirmationModal) {
        confirmationModal.style.display = 'none';
    }
}
