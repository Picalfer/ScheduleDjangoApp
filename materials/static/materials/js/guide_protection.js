document.addEventListener('DOMContentLoaded', function () {
    // Запрет контекстного меню
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
    });

    // Запрет горячих клавиш
    document.addEventListener('keydown', function (e) {
        // Ctrl+C, Ctrl+A, etc.
        if (e.ctrlKey && [65, 67, 86, 88, 85].includes(e.keyCode)) {
            e.preventDefault();
        }
    });

    // Защита от iframe
    if (window !== window.top) {
        window.top.location = window.location;
    }
});


// Запрет копирования текста, кроме ссылок
document.addEventListener('copy', function (event) {
    const selection = window.getSelection(); // Получаем выделенный текст
    if (!selection.toString().includes('http')) { // Проверяем, содержит ли выделенный текст ссылку
        event.preventDefault(); // Запрещаем копирование, если это не ссылка
    }
});

// Дополнительная защита: предотвращение открытия контекстного меню (правый клик)
document.addEventListener('contextmenu', function (event) {
    event.preventDefault(); // Запрет открытия контекстного меню
});

// Запрет перетаскивания элементов
document.addEventListener('dragstart', function (event) {
    event.preventDefault();
});

// Запрет выделения всего текста с помощью Ctrl+A
document.addEventListener('keydown', function (event) {
    if (event.ctrlKey && event.key === 'a') {
        event.preventDefault();
    }
});

// Запрет открытия консоли разработчика
document.addEventListener('keydown', function (event) {
    if (event.key === 'F12' || (event.ctrlKey && event.shiftKey && event.key === 'I')) {
        event.preventDefault();
    }
});

document.addEventListener('keydown', function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault(); // Попытка предотвратить сохранение
        alert('Сохранение страницы запрещено.');
    }
});