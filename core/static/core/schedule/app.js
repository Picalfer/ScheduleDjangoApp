import {CalendarManager} from "./calendarManager.js";
import {SettingsManager} from "./settingsManager.js";
import {TeachersModal} from "./modals/teachersModal.js";
import {PaymentsModal} from "./modals/paymentsModal.js";
import {showNotification} from "./utils.js";
import {LessonModal} from "./modals/lessonModal.js";
import {Repository} from "./repository.js";
import {BalanceAlertModal} from "./modals/balanceAlertModal.js";

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
}

function setAdminTools() {
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
}

export const scheduleState = {isAnother: false};

// Важен порядок инициализации
export const repository = new Repository();
export const calendarManager = new CalendarManager();
export const settingsManager = new SettingsManager();
