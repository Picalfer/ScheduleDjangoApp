import * as utils from "./utils.js";

const SCHEDULE_FIELD_ID = "UF_USR_1739378861094";
export const AMOUNT_LESSONS_FIELD_ID = "UF_CRM_1739959665254";

const DEFAULT_SCHEDULE_DATA = {
    "settings": {
        "workingHours": {
            "start": 10,
            "end": 20
        }
    },
    "weeklyOpenSlots": {
        "monday": [],
        "tuesday": [],
        "wednesday": [],
        "thursday": [],
        "friday": [],
        "saturday": [],
        "sunday": []
    },
    "students": []
};

let currentUserId = null;

export function initBx24() {
    BX24.init(async function () {
        BX24.fitWindow();
        // Получаем данные авторизации
        const authData = BX24.getAuth();

        currentUserId = await getMyId();
    });
}

export async function getMyId() {
    const user = await getCurrentUser();
    return user.ID;
}

export function isAdmin() {
    return new Promise((resolve, reject) => {
        BX24.callMethod(
            "user.admin",
            {},
            function (result) {
                if (result.error())
                    reject(result.error());
                else
                    resolve(result.data());
            }
        );
    })
}

export function setUserName() {
    getCurrentUser().then(user => {
        const teacherNameElement = document.querySelector('.teacher-name');
        teacherNameElement.textContent = `${user.NAME} ${user.LAST_NAME}`;
    });
}

export function getCurrentUser() {
    return new Promise((resolve, reject) => {
        BX24.callMethod("user.current", {}, function (result) {
            if (result.error()) {
                reject(result.error());
            } else {
                resolve(result.data());
            }
        });
    });
}

export function getSchedule(teacherId = currentUserId) {
    return new Promise(async (resolve, reject) => {
        if (teacherId == null) {
            teacherId = await getMyId()
        }
        getTeacherByID(teacherId).then(async teachers => {
            if (teachers) {
                const teacher = teachers[0];
                // Проверяем, существует ли кастомное поле
                if (!teacher || !teacher[SCHEDULE_FIELD_ID]) {
                    console.warn(`Кастомное поле ${SCHEDULE_FIELD_ID} не найдено или оно пустое.`);
                    console.info(`Инициализируем пустое расписание для пользователя ${teacher?.ID || "неизвестного"}`);
                    await initNewSchedule(teacher);
                    resolve(DEFAULT_SCHEDULE_DATA);
                    return;
                }

                // Если данные уже существуют, просто возвращаем их
                let scheduleData = teacher[SCHEDULE_FIELD_ID];

                // Проверяем, что данные имеют нужную структуру
                if (typeof scheduleData === 'string') {
                    try {
                        scheduleData = JSON.parse(scheduleData); // Пробуем парсить строку в объект
                    } catch (error) {
                        console.error("Ошибка парсинга данных:", error);
                        scheduleData = {}; // Возвращаем пустой объект в случае ошибки
                    }
                }

                if (typeof scheduleData !== 'object') {
                    console.error("Полученные данные не являются объектом:", scheduleData);
                    scheduleData = {}; // Возвращаем пустой объект в случае ошибки
                }

                resolve(scheduleData); // Возвращаем обработанные данные
            }
        }).catch(error => {
            // Обработка ошибки, если преподаватель не найден
            console.error("Ошибка получения данных о преподавателе:", error);
            utils.showNotification(`Клиент с ID ${teacherId} не найден.`, 'error'); // Показываем уведомление
        });

    });
}

export function updateSchedule(scheduleData, teacherId = null) {
    return new Promise((resolve, reject) => {
        const userId = teacherId || currentUserId; // Используем переданный ID или текущего пользователя

        if (!userId) {
            console.error("ID пользователя не найден.");
            reject("ID пользователя не найден.");
            return;
        }

        // Обновляем расписание
        BX24.callMethod("user.update", {
            ID: userId, // Используем переданный или сохраненный ID
            [SCHEDULE_FIELD_ID]: JSON.stringify(scheduleData) // Записываем обновленное расписание
        }, function (updateResult) {
            if (updateResult.error()) {
                console.error("Ошибка обновления данных:", updateResult.error());
                reject(updateResult.error());
            } else {
                console.log(`Данные успешно обновлены для пользователя ${userId}:`, scheduleData);
                resolve(updateResult);
            }
        });
    });
}

export function updateLessonBalance(clientId, newBalance) {
    return new Promise((resolve, reject) => {
        BX24.callMethod(
            "crm.contact.update",
            {
                id: clientId,
                fields: {
                    [AMOUNT_LESSONS_FIELD_ID]: newBalance,
                }
            },
            function (result) {
                if (result.error()) {
                    console.error("Ошибка при попытке изменить баланс уроков", result.error());
                    reject(result.error());
                } else {
                    let data = result.data()
                    resolve(data);
                }
            }
        );
    })
}

export function getClientByID(clientId) {
    return new Promise((resolve, reject) => {
        BX24.callMethod(
            "crm.contact.get",
            {
                id: clientId
            },
            function (result) {
                if (result.error()) {
                    console.error("Ошибка получения данных:", result.error());
                    reject(result.error());
                } else {
                    let client = result.data()
                    console.log("getClientByID" + client); // Выведем в консоль для отладки
                    resolve(client);
                }
            }
        );
    });
}

export function getTeacherByID(teacherId) {
    return new Promise((resolve, reject) => {
        BX24.callMethod(
            "user.get", // Название метода
            {ID: teacherId}, // ID сотрудника
            function (result) {
                if (result.error()) {
                    console.error("Ошибка:", result.error());
                    reject(result.error());
                } else {
                    console.log("Данные сотрудника под ID " + teacherId + ": ", result.data());
                    resolve(result.data());
                }
            }
        );
    });
}

function initNewSchedule(user) {
    BX24.callMethod("user.update", {
        ID: user.ID,
        [SCHEDULE_FIELD_ID]: JSON.stringify(DEFAULT_SCHEDULE_DATA) // Записываем шаблон JSON
    }, function (updateResult) {
        if (updateResult.error()) {
            console.error("Ошибка обновления данных:", updateResult.error());
        } else {
            console.log("Данные успешно инициализированы:", DEFAULT_SCHEDULE_DATA); // Выводим инициализированные данные
        }
    });
}