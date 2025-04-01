import {CalendarManager} from './calendarManager.js';
import {SettingsManager} from './settingsManager.js';
import {LessonModalManager} from './lessonModalManager.js';
import {AddStudentModalManager} from './addStudentModalManager.js';
import {showNotification} from "./utils.js";
import {getTeachers} from "./repository.js";
import {openTeachersModal} from "./seeTeacherSchedule.js";

export const calendarManager = new CalendarManager();
const settingsManager = new SettingsManager(calendarManager);
const lessonModalManager = new LessonModalManager();
const addStudentModalManager = new AddStudentModalManager();


export function initApp() {
    calendarManager.loadSchedule();
    calendarManager.updateCalendarUi()
    calendarManager.goToCurrentWeek();

    document.getElementById('prev-week').addEventListener('click', () => {
        if (settingsManager.isOpenWindowsMode) {
            showNotification("Недоступно в режиме выбора открытых окон", "error");
        } else {
            calendarManager.prevWeek();
        }
    });

    document.getElementById('next-week').addEventListener('click', () => {
        if (settingsManager.isOpenWindowsMode) {
            showNotification("Недоступно в режиме выбора открытых окон", "error");
        } else {
            calendarManager.nextWeek();
        }
    });

    document.getElementById('current-week').addEventListener('click', () => {
        if (settingsManager.isOpenWindowsMode) {
            showNotification("Недоступно в режиме выбора открытых окон", "error");
        } else {
            calendarManager.goToCurrentWeek();
        }
    });

    // Обработчик для кнопки настроек
    document.getElementById('settings-button').addEventListener('click', () => {
        if (settingsManager.isOpenWindowsMode) {
            showNotification("Недоступно в режиме выбора открытых окон", "error");
        } else {
            settingsManager.open();
        }
    });

    if (userData.isAdmin) {
        setAdminTools()
    }
}

function setAdminTools() {
    openTeachersModal()

    /*// Обработчик для кнопки добавления нового ученика
    document.getElementById('add-student-button').addEventListener('click', () => {
        if (settingsManager.isOpenWindowsMode) {
            showNotification("Недоступно в режиме выбора открытых окон", "error");
        } else {
            addStudentModalManager.open()
        }
    });*/
}

window.openLessonModal = (lessonData) => {
    if (settingsManager.isOpenWindowsMode) {
        showNotification("Недоступно в режиме выбора открытых окон", "error");
    } else {
        lessonModalManager.open(lessonData);
    }
};