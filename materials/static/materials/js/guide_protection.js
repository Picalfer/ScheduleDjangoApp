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
document.addEventListener('DOMContentLoaded', function () {
    // Находим все ссылки в основном контенте
    const links = document.querySelectorAll('.guide-content a');
    const navContainer = document.querySelector('.guide-nav');

    // Очищаем существующие примеры
    navContainer.innerHTML = '';

    // Добавляем реальные ссылки
    links.forEach(link => {
        if (link.href && link.textContent.trim()) {
            const navLink = document.createElement('a');
            navLink.href = link.href;
            navLink.className = 'nav-link';
            navLink.textContent = link.textContent;
            navContainer.appendChild(navLink);
        }
    });

    // Если ссылок нет, показываем заглушку
    if (navContainer.children.length === 0) {
        navContainer.innerHTML = '<p class="no-links">Ссылки не найдены</p>';
    }

    try {
        // 1. Проверяем существование основных элементов
        const navContainer = document.querySelector('.guide-nav');
        const modal = document.getElementById('imageModal');
        const modalImg = document.getElementById('modalImage');
        const modalOverlay = document.querySelector('.modal-overlay');

        if (!navContainer) console.warn('Navigation container not found');
        if (!modal) console.warn('Modal container not found');
        if (!modalImg) console.warn('Modal image element not found');
        if (!modalOverlay) console.warn('Modal overlay not found');

        // 2. Обработка ссылок (если контейнер существует)
        if (navContainer) {
            const links = document.querySelectorAll('.guide-content a');
            navContainer.innerHTML = '';

            links.forEach(link => {
                if (link.href && link.textContent.trim()) {
                    const navLink = document.createElement('a');
                    navLink.href = link.href;
                    navLink.className = 'nav-link';
                    navLink.textContent = link.textContent;
                    navContainer.appendChild(navLink);
                }
            });

            if (navContainer.children.length === 0) {
                navContainer.innerHTML = '<p class="no-links">Ссылки не найдены</p>';
            }
        }

        // 3. Обработка изображений
        const images = document.querySelectorAll('.guide-content img');

        if (images.length > 0) {
            images.forEach(img => {
                // Пропускаем если уже обработано
                if (img.classList.contains('processed-img')) return;

                // Создаем контейнер
                const container = document.createElement('div');
                container.className = 'img-container';

                // Оборачиваем изображение
                img.parentNode.insertBefore(container, img);
                container.appendChild(img);

                // Добавляем лупу
                const magnifier = document.createElement('div');
                magnifier.className = 'img-magnifier';
                container.appendChild(magnifier);

                // Помечаем как обработанное
                img.classList.add('processed-img');

                // Обработчик клика
                container.addEventListener('click', function (e) {
                    e.preventDefault();
                    if (modal && modalImg) {
                        openModal(img.src, modal, modalImg);
                    }
                });
            });
        }

        // 4. Функции модального окна (если элементы существуют)
        if (modal && modalImg && modalOverlay) {
            // Закрытие по клику
            modalOverlay.addEventListener('click', () => closeModal(modal));
            modalImg.addEventListener('click', () => closeModal(modal));

            // Закрытие по ESC
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && modal.style.display === 'flex') {
                    closeModal(modal);
                }
            });
        }

        // Функция открытия модалки
        function openModal(src, modalElement, imgElement) {
            modalElement.style.display = 'flex';
            imgElement.src = src;
            document.body.style.overflow = 'hidden';

            setTimeout(() => {
                imgElement.style.maxHeight = `${window.innerHeight * 0.9}px`;
            }, 10);
        }

        // Функция закрытия модалки
        function closeModal(modalElement) {
            modalElement.classList.add('closing');
            setTimeout(() => {
                modalElement.style.display = 'none';
                modalElement.classList.remove('closing');
                document.body.style.overflow = '';
            }, 200);
        }

        const guideContent = document.querySelector('.guide-content');
        const guideToc = document.querySelector('.guide-toc');

        if (!guideContent || !guideToc) return;

        // Находим все значимые заголовки (адаптировано под вашу структуру Word->HTML)
        const headings = guideContent.querySelectorAll(`
        span[style*="font-size:18pt"], 
            span[style*="font-size:16pt"] 
    `);

        if (headings.length === 0) {
            guideToc.innerHTML = '<p>Оглавление не найдено</p>';
            return;
        }

        let tocHtml = '<ul class="toc-list">';
        let currentLevel = 0;

        headings.forEach(heading => {
            // Создаем уникальный ID для якоря
            if (!heading.id) {
                heading.id = 'section-' + Math.random().toString(36).substr(2, 6);
            }

            const text = heading.textContent.trim();
            if (!text) return;

            // Определяем уровень вложенности
            const isMainHeader = heading.matches(`
            h2, 
            p[style*="font-size:18pt"], 
            p[style*="font-weight:700"]
        `);

            const level = isMainHeader ? 1 : 2;

            // Добавляем пункт в оглавление
            tocHtml += `
            <li class="toc-item level-${level}">
                <a href="#${heading.id}" class="toc-link">${text}</a>
            </li>
        `;
        });

        tocHtml += '</ul>';
        guideToc.innerHTML = tocHtml;

        // Плавная прокрутка с отступом
        guideToc.addEventListener('click', function (e) {
            if (e.target.classList.contains('toc-link')) {
                e.preventDefault();
                const target = document.querySelector(e.target.getAttribute('href'));
                if (target) {
                    window.scrollTo({
                        top: target.offsetTop + 50,
                        behavior: 'smooth'
                    });
                }
            }
        });
    } catch (error) {
        console.error('Error in guide script:', error);
    }
});