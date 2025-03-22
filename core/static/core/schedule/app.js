import {Calendar} from './calendar.js';
import {SettingsManager} from './settings.js';
import {LessonModal} from './lessonModal.js';
import {AddStudentModal} from './addStudentModal.js';
import {showNotification} from "./utils.js";

export const calendar = new Calendar();
const settingsManager = new SettingsManager(calendar);
const lessonModal = new LessonModal();
const addStudentModal = new AddStudentModal();


export function initApp() {
    calendar.loadScheduleData();
    calendar.updateCalendarUi()
    calendar.goToCurrentWeek();

    // Обработчики событий для кнопок навигации
    document.getElementById('prev-week').addEventListener('click', () => {
        if (settingsManager.isOpenWindowsMode) {
            showNotification("Недоступно в режиме выбора открытых окон", "error");
        } else {
            calendar.prevWeek();
        }
    });

    document.getElementById('next-week').addEventListener('click', () => {
        if (settingsManager.isOpenWindowsMode) {
            showNotification("Недоступно в режиме выбора открытых окон", "error");
        } else {
            calendar.nextWeek();
        }
    });

    document.getElementById('current-week').addEventListener('click', () => {
        if (settingsManager.isOpenWindowsMode) {
            showNotification("Недоступно в режиме выбора открытых окон", "error");
        } else {
            calendar.goToCurrentWeek();
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

    // Обработчик для кнопки добавления нового ученика
    document.getElementById('add-student-button').addEventListener('click', () => {
        if (settingsManager.isOpenWindowsMode) {
            showNotification("Недоступно в режиме выбора открытых окон", "error");
        } else {
            addStudentModal.open()
        }
    });
}

// Глобальная функция для открытия модального окна урока
window.openLessonModal = (lessonData) => {
    if (settingsManager.isOpenWindowsMode) {
        showNotification("Недоступно в режиме выбора открытых окон", "error");
    } else {
        lessonModal.open(lessonData);
    }
};