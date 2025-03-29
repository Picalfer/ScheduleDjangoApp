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

export function showConfirmationModal({
    text,
    onConfirm,
    onCancel,
    inputConfig = null  // Новый параметр для настройки ввода
}) {
    const confirmationModal = document.getElementById('confirmation-modal');
    if (!confirmationModal) return;

    // Обновляем текст
    const confirmationText = document.getElementById('confirmation-text');
    confirmationText.innerHTML = text;

    // Элементы для ввода (добавляем динамически)
    const inputContainer = document.getElementById('input-container');
    let inputElement = null;

    if (inputConfig) {
        inputContainer.innerHTML = ''; // Очищаем предыдущий ввод

        // Создаем input/textarea в зависимости от конфига
        inputElement = document.createElement(inputConfig.type === 'textarea' ? 'textarea' : 'input');
        inputElement.placeholder = inputConfig.placeholder || '';
        inputElement.required = inputConfig.required || false;

        if (inputConfig.type === 'number') {
            inputElement.type = 'number';
            inputElement.min = inputConfig.min || '';
            inputElement.max = inputConfig.max || '';
        }

        inputContainer.appendChild(inputElement);
        inputContainer.style.display = 'block';
    } else {
        inputContainer.style.display = 'none';
    }

    // Показываем модалку
    confirmationModal.style.display = 'block';
    confirmationModal.style.zIndex = '10001';

    // Обработчики кнопок
    document.getElementById('confirm-change').onclick = () => {
        if (inputConfig?.required && (!inputElement || !inputElement.value.trim())) {
            alert(inputConfig.errorMessage || 'Поле обязательно для заполнения');
            return;
        }

        const inputValue = inputElement ? inputElement.value : null;
        onConfirm(inputValue);  // Передаем введенное значение
        this.closeConfirmationModal();
    };

    document.getElementById('cancel-change').onclick = () => {
        onCancel?.();
        this.closeConfirmationModal();
    };
}

export function closeConfirmationModal() {
    const confirmationModal = document.getElementById('confirmation-modal');
    if (confirmationModal) {
        confirmationModal.style.display = 'none';
    }
}
