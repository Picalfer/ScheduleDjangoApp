import {CalendarManager} from "./schedule/calendarManager.js";
import {SettingsManager} from "./schedule/settingsManager.js";
import {TeachersModal} from "./schedule/modals/teachersModal.js";
import {PaymentsModal} from "./schedule/modals/paymentsModal.js";
import {showNotification} from "./schedule/utils.js";
import {LessonModal} from "./schedule/modals/lessonModal.js";
import {Repository} from "./schedule/repository.js";

document.addEventListener("DOMContentLoaded", function () {
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
});

export const repository = new Repository();
export const calendarManager = new CalendarManager();
export const settingsManager = new SettingsManager(calendarManager);

function setAdminTools() {
    const teachersBtn = document.getElementById('teachers-button')
    teachersBtn.addEventListener('click', () => {
        const teachersModal = new TeachersModal().open();
    })

    const paymentsBtn = document.getElementById("payments-button");
    paymentsBtn.addEventListener('click', async function () {
        const paymentsModal = new PaymentsModal().open();
    })
}
