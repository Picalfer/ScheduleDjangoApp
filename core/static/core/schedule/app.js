import * as BX24API from './bx24api.js';
import {Calendar} from './calendar.js';
import {SettingsManager} from './settings.js';
import {LessonModal} from './lessonModal.js';
import {AddStudentModal} from './addStudentModal.js';
import {showNotification} from "./utils.js";

export const calendar = new Calendar();
const lessonModal = new LessonModal();
const addStudentModal = new AddStudentModal();
const settingsManager = new SettingsManager(calendar);


export function initApp() {
    /*BX24API.initBx24();
    setIsAdmin()
    BX24API.setUserName();

    calendar.loadScheduleData();
*/
    calendar.updateCalendarUi()
    calendar.goToCurrentWeek();

    console.log("test2")
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

function setIsAdmin() {
    BX24API.isAdmin()
        .then((isAdmin) => {
            if (isAdmin) {
                // Показываем подпись "администратор"
                const adminLabel = document.getElementById('admin-label');
                if (adminLabel) {
                    adminLabel.style.display = 'inline'; // Показываем элемент
                }

                // Показываем кнопкии панели админа
                document.getElementById('admin-panel').style.display = 'inline-block';

                document.getElementById('students-button').style.display = 'inline-block';
                document.getElementById('add-student-button').style.display = 'inline-block';
                document.getElementById('teachers-button').style.display = 'inline-block';
                document.getElementById('students-button').disabled = false;
                document.getElementById('add-student-button').disabled = false;
                document.getElementById('teachers-button').disabled = false;

                document.getElementById('toggle-schedule-panel').addEventListener('click', function () {
                    const schedulePanel = document.getElementById('schedule-info-panel');

                    schedulePanel.classList.toggle('collapsed');
                });

            }
        })
        .catch((error) => {
            console.error('Ошибка при проверке прав администратора:', error);
        });
}