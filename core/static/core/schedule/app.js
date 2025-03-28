import {CalendarManager} from './calendarManager.js';
import {SettingsManager} from './settingsManager.js';
import {LessonModalManager} from './lessonModalManager.js';
import {AddStudentModalManager} from './addStudentModalManager.js';
import {showNotification} from "./utils.js";
import {completeLesson, createLesson} from "./repository.js";

export const calendarManager = new CalendarManager();
const settingsManager = new SettingsManager(calendarManager);
const lessonModalManager = new LessonModalManager();
const addStudentModalManager = new AddStudentModalManager();


export function initApp() {
    initTestBtn()

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
    // Обработчик для кнопки добавления нового ученика
    document.getElementById('add-student-button').addEventListener('click', () => {
        if (settingsManager.isOpenWindowsMode) {
            showNotification("Недоступно в режиме выбора открытых окон", "error");
        } else {
            addStudentModalManager.open()
        }
    });
}

function initTestBtn() {
    document.getElementById('test-button').addEventListener('click', async () => {
        try {
            const result = await createLesson(
                '2025-03-26',  // date (YYYY-MM-DD)
                '20:00',       // time (HH:MM)
                2,             // teacher_id (должен существовать в БД)
                1,             // student_id (должен существовать в БД)
                'Math',        // subject
                false          // is_recurring (опционально)
            );
            console.log('Lesson created:', result);
        } catch (error) {
            console.error('Failed to create lesson:', error.message);
            alert(`Error: ${error.message}`);  // Показываем пользователю
        }
    });

    document.getElementById('test-button2').addEventListener('click', async () => {
        try {
            const result = await completeLesson(7); // Тестовый ID урока
            console.log('Урок проведен:', result);
            alert(`Урок проведен! Осталось: ${result.remaining_balance} уроков`);
        } catch (error) {
            console.error('Ошибка:', error);
            alert(`Ошибка: ${error.message}`);
        }
    })
}

window.openLessonModal = (lessonData) => {
    if (settingsManager.isOpenWindowsMode) {
        showNotification("Недоступно в режиме выбора открытых окон", "error");
    } else {
        lessonModalManager.open(lessonData);
    }
};