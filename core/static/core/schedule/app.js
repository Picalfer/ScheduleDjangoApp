import {CalendarManager} from "./calendarManager.js";
import {SettingsManager} from "./settingsManager.js";
import {TeachersModal} from "./modals/teachersModal.js";
import {PaymentsModal} from "./modals/paymentsModal.js";
import {showNotification} from "./utils.js";
import {LessonModal} from "./modals/lessonModal.js";
import {Repository} from "./repository.js";

export function initApp() {

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
}