import {CalendarManager} from "./calendarManager.js";
import {SettingsManager} from "./settingsManager.js";
import {TeachersModal} from "./modals/teachersModal.js";
import {PaymentsModal} from "./modals/paymentsModal.js";
import {updateCounter} from "./utils.js";
import {showNotification} from "./notifications.js";
import {LessonModal} from "./modals/lessonModal.js";
import {Repository} from "./repository.js";
import {BalanceAlertModal} from "./modals/balanceAlertModal.js";

export const scheduleState = {
    isAnother: false,
    teacherId: currentTeacherId,
    userId: currentUserId
};

export const repository = new Repository();
export const settingsManager = new SettingsManager();
export const calendarManager = new CalendarManager();

// Функция для асинхронной инициализации менеджеров
export async function initializeManagers() {
    console.log('Initializing managers...');

    // Сначала загружаем настройки
    await settingsManager.loadSettingsFromServer();

    // Потом инициализируем календарь с примененными настройками
    await calendarManager.initialize();

    console.log('All managers initialized');
}

export function initApp() {
    if (userData.isAdmin) {
        setAdminTools()
    }

    window.openLessonModal = (lessonData) => {
        if (settingsManager.isOpenWindowsMode) {
            showNotification("Недоступно в режиме выбора открытых окон", "error");
        } else {
            const lessonModal = new LessonModal();
            lessonModal.open(lessonData);
        }
    }

    setupContextMenu();
}

async function setAdminTools() {
    const teachersBtn = document.getElementById('teachers-button')
    teachersBtn.addEventListener('click', () => {
        const teachersModal = new TeachersModal().open();
    })

    const paymentsBtn = document.getElementById("payments-button");
    paymentsBtn.addEventListener('click', async function () {
        const paymentsModal = new PaymentsModal().open();
    })

    const balanceAlertBtn = document.getElementById("balance-alert-button");
    balanceAlertBtn.addEventListener('click', async function () {
        const balanceAlertModal = new BalanceAlertModal().open()
    })

    const lowBalanceClientsCount = await repository.loadLowBalanceClientsCount()
    const paymentsCount = await repository.loadPaymentsCount()

    updateCounter('balance-alert-counter', lowBalanceClientsCount);
    updateCounter('payments-counter', paymentsCount);
}

function setupContextMenu() {
    const customContextMenu = document.createElement('div');
    customContextMenu.id = 'custom-context-menu';
    customContextMenu.style.display = 'none';
    document.body.appendChild(customContextMenu);

    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        customContextMenu.innerHTML = `
            <div class="menu-item" data-action="refresh">🔄 Обновить расписание</div>
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
            calendarManager.loadSchedule(scheduleState.teacherId, scheduleState.userId)
        }

        customContextMenu.style.display = 'none';
    });
}

// Запускаем приложение
async function startApp() {
    try {
        await initializeManagers();
        initApp();
        console.log('App started successfully');
    } catch (error) {
        console.error('Failed to start app:', error);
    }
}

// Запускаем приложение когда DOM загружен
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    startApp();
}