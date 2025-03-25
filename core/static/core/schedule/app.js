import {CalendarManager} from './calendarManager.js';
import {SettingsManager} from './settingsManager.js';
import {LessonModalManager} from './lessonModalManager.js';
import {AddStudentModalManager} from './addStudentModalManager.js';
import {showNotification} from "./utils.js";
import {createLesson, getLessons} from "./repository.js";

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
                '2025-03-25',  // date (YYYY-MM-DD)
                '17:00',       // time (HH:MM)
                1,             // teacher_id (должен существовать в БД)
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
            await getLessons(1, '2025-03-20', '2025-03-30')
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    })
}

// Глобальная функция для открытия модального окна урока
window.openLessonModal = (lessonData) => {
    if (settingsManager.isOpenWindowsMode) {
        showNotification("Недоступно в режиме выбора открытых окон", "error");
    } else {
        lessonModalManager.open(lessonData);
    }
};