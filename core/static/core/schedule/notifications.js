let notificationQueue = [];
let isNotificationShowing = false;
let notificationTimer = null;

export function showNotification(message, type = 'info') {
    notificationQueue.push({message, type});

    if (!isNotificationShowing) {
        showNextNotification();
    }
}

function showNextNotification() {
    if (notificationQueue.length === 0) {
        isNotificationShowing = false;
        return;
    }

    isNotificationShowing = true;

    const {message, type} = notificationQueue[0];
    const notification = document.getElementById('notification');
    const notificationText = notification.querySelector('.notification-text');
    const progressBar = notification.querySelector('.notification-progress');
    const hideAllButton = document.getElementById('hide-all-button');
    const hideButton = document.getElementById('hide-button');

    notification.classList.remove('notification-appear', 'notification-pop');

    const oldBadge = notification.querySelector('.notification-counter-badge');
    if (oldBadge) {
        oldBadge.remove();
    }

    // Устанавливаем цвет уведомления в зависимости от типа
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#4CAF50';
            break;
        case 'error':
            notification.style.backgroundColor = '#f44336';
            break;
        case 'info':
        default:
            notification.style.backgroundColor = '#2196F3';
            break;
    }

    notificationText.textContent = message;

    // Показываем/скрываем кнопку "Скрыть все" в зависимости от количества уведомлений в очереди
    if (notificationQueue.length > 1) {
        hideAllButton.style.display = 'block';
        createNotificationCounterBadge(notification, notificationQueue.length - 1, type);
    } else {
        hideAllButton.style.display = 'none';
    }

    resetProgressBar(progressBar);

    notification.style.display = 'block';
    notification.style.zIndex = '1001';

    // Обработчики для кнопок действий
    hideButton.onclick = () => {
        clearTimeout(notificationTimer);
        hideNotificationAndShowNext(notification);
    };

    hideAllButton.onclick = () => {
        clearTimeout(notificationTimer);
        // Очищаем всю очередь, кроме текущего уведомления
        notificationQueue = [notificationQueue[0]];
        hideNotificationAndShowNext(notification);
    };

    setTimeout(() => {
        notification.classList.add('notification-appear');
    }, 10);

    setTimeout(() => {
        startProgressBar(progressBar);
    }, 50);

    // Возвращаем 3 секунды как было
    notificationTimer = setTimeout(() => {
        hideNotificationAndShowNext(notification);
    }, 3000);
}

function startProgressBar(progressBar) {
    progressBar.style.transition = 'transform 3s linear'; // Возвращаем 3 секунды
    progressBar.style.transform = 'scaleX(0)';
}

function createNotificationCounterBadge(notification, count, type) {
    const badge = document.createElement('div');
    badge.className = `notification-counter-badge ${type} pulse`;
    badge.textContent = `${count}`;

    const notificationContent = notification.querySelector('.notification-content');
    notificationContent.appendChild(badge);
}

function hideNotificationAndShowNext(notification) {
    const progressBar = notification.querySelector('.notification-progress');

    notification.classList.remove('notification-appear');
    notification.classList.add('notification-pop');

    setTimeout(() => {
        notification.style.display = 'none';
        notification.classList.remove('notification-pop');

        resetProgressBar(progressBar);

        // Удаляем показанное уведомление из очереди
        notificationQueue.shift();

        // Сбрасываем обработчики кнопок
        document.getElementById('hide-button').onclick = null;
        document.getElementById('hide-all-button').onclick = null;

        setTimeout(() => {
            showNextNotification();
        }, 100);
    }, 400);
}

function addNotificationAnimations() {
    const style = document.createElement('style');
    style.textContent = `
        #notification.notification-appear {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        
        #notification.notification-pop {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
        }
        
        #notification {
            transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
        }
    `;
    document.head.appendChild(style);
}

function resetProgressBar(progressBar) {
    progressBar.style.transition = 'none';
    progressBar.style.transform = 'scaleX(1)';
    progressBar.style.opacity = '1';
    void progressBar.offsetWidth;
}

// Инициализация при загрузке модуля
addNotificationAnimations();

window.showNotification = showNotification;