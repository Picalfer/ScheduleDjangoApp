/*document.addEventListener('DOMContentLoaded', function () {

    setupContextMenu();

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

// Блокировка сочетаний клавиш
function disableShortcuts(e) {
    // Блокировка Ctrl+S, Ctrl+Shift+S, F12
    if ((e.ctrlKey && e.key === 's') ||
        (e.ctrlKey && e.shiftKey && e.key === 's') ||
        e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }

    // Блокировка правой кнопки мыши
    if (e.button === 2) {
        return false;
    }
}

// Запрет контекстного меню
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

// Защита от открытия DevTools
(function() {
    function blockDevTools() {
        // Проверка на открытие DevTools через размер окна
        const widthThreshold = window.outerWidth - window.innerWidth > 160;
        const heightThreshold = window.outerHeight - window.innerHeight > 160;

        if (widthThreshold || heightThreshold) {
            document.body.innerHTML = '<h1 style="color:red">Доступ запрещен</h1>';
            window.location.reload();
        }
    }

    // Проверяем каждые 500 мс
    setInterval(blockDevTools, 500);
    window.addEventListener('resize', blockDevTools);
})();

// Запрет выделения текста (опционально)
document.addEventListener('selectstart', function(e) {
    e.preventDefault();
});

function setupContextMenu() {
    const customContextMenu = document.createElement('div');
    customContextMenu.id = 'custom-context-menu';
    customContextMenu.style.display = 'none';
    document.body.appendChild(customContextMenu);

    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        customContextMenu.innerHTML = `
            <div class="menu-item" data-action="refresh">🔄 Обновить</div>
        `;
        customContextMenu.style.display = 'block';
        customContextMenu.style.left = `${e.pageX}px`;
        customContextMenu.style.top = `${e.pageY}px`;
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') customContextMenu.style.display = 'none';
    });

    document.addEventListener('click', (e) => {
        if (e.button !== 2) {
            customContextMenu.style.display = 'none';
        }
    });

    customContextMenu.addEventListener('click', (e) => {
        const menuItem = e.target.closest('.menu-item');
        if (!menuItem) return;

        const action = menuItem.dataset.action;
        if (action === 'refresh') {
            location.reload();
        }

        customContextMenu.style.display = 'none';
    });
}*/

/*

// Запрет копирования текста, кроме ссылок
document.addEventListener('copy', function (event) {
    const selection = window.getSelection(); // Получаем выделенный текст
    if (!selection.toString().includes('http')) { // Проверяем, содержит ли выделенный текст ссылку
        event.preventDefault(); // Запрещаем копирование, если это не ссылка
    }
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
});*/
