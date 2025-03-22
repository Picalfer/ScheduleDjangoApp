const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

export function getOpenSlots(teacherId = currentUserId) {
    return fetch(`/api/open-slots/${teacherId}/`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Ошибка: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => data.weekly_open_slots)
        .catch(error => {
            console.error("Ошибка при получении свободных слотов:", error);
            throw error;
        });
}

export function updateOpenSlots(openSlots, teacherId = currentUserId) {
    return fetch(`/api/open-slots/${teacherId}/update/`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({weekly_open_slots: openSlots}),
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Ошибка: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => data.weekly_open_slots)
        .catch(error => {
            console.error("Ошибка при обновлении свободных слотов:", error);
            throw error;
        });
}

export function getSchedule(teacherId = currentUserId) {
    return new Promise(async (resolve, reject) => {
        resolve(EXAMPLE_SCHEDULE_DATA)
        /*if (teacherId == null) {
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
        });*/

    });
}

export function updateSchedule(scheduleData, teacherId = null) {
    return true
    /*return fetch(`/api/teacher-availability/${teacherId}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleData.weeklyOpenSlots),
    })
        .then(response => response.json())
        .catch(error => {
            console.error("Ошибка обновления открытых окон:", error);
        });*/
}


export function updateLessonBalance(clientId, newBalance) {
    return new Promise((resolve, reject) => {
        resolve("true шо")
        /*BX24.callMethod(
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
        );*/
    })
}

export function getClientByID(clientId) {
    return new Promise((resolve, reject) => {
        resolve("true шо")
        /*BX24.callMethod(
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
        );*/
    });
}

export function getTeacherByID(teacherId) {
    return new Promise((resolve, reject) => {
        resolve("true шо")
        /*BX24.callMethod(
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
        );*/
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

let EXAMPLE_OPEN_SLOTS = {
    "weeklyOpenSlots": {
        "monday": [
            "18:00",
            "20:00",
            "21:00"
        ],
        "tuesday": [
            "21:00"
        ],
        "wednesday": [],
        "thursday": [
            "21:00",
            "22:00"
        ],
        "friday": [
            "16:00",
            "17:00",
            "18:00",
            "22:00"
        ],
        "saturday": [
            "19:00",
            "20:00",
            "21:00"
        ],
        "sunday": [
            "18:00",
            "19:00",
            "20:00",
            "21:00",
            "22:00"
        ]
    },
}

const EXAMPLE_SCHEDULE_DATA = {
    "students": [
        {
            "id": 1,
            "name": "Женя(Наталья)",
            "regularSchedule": [
                {
                    "day": "sunday",
                    "time": "18:00",
                    "subject": "Python"
                }
            ],
            "oneTimeLessons": []
        },
        {
            "id": 2,
            "name": "Илья(Ольга)",
            "regularSchedule": [
                {
                    "day": "friday",
                    "time": "21:00",
                    "subject": "Frontend"
                }
            ],
            "oneTimeLessons": [
                {
                    "date": "2025-03-19",
                    "time": "20:00",
                    "subject": "Frontend"
                }
            ]
        },
        {
            "id": 3,
            "name": "Артём(Кристина)",
            "regularSchedule": [],
            "oneTimeLessons": [
                {
                    "date": "2025-03-22",
                    "time": "21:00",
                    "subject": "Android"
                },
                {
                    "date": "2025-03-19",
                    "time": "17:00",
                    "subject": "Android"
                }
            ]
        },
        {
            "id": 4,
            "name": "Саша(Мария)",
            "regularSchedule": [
                {
                    "day": "monday",
                    "time": "21:00",
                    "subject": "Unity"
                },
                {
                    "day": "friday",
                    "time": "20:00",
                    "subject": "Unity"
                },
                {
                    "day": "sunday",
                    "time": "21:00",
                    "subject": "Unity"
                }
            ],
            "oneTimeLessons": []
        },
        {
            "id": 5,
            "name": "Никита(Кристина)",
            "regularSchedule": [
                {
                    "day": "tuesday",
                    "time": "19:00",
                    "subject": "Frontend"
                },
                {
                    "day": "thursday",
                    "time": "19:00",
                    "subject": "Frontend"
                }
            ],
            "oneTimeLessons": []
        },
        {
            "id": 6,
            "name": "Ева(Елена)",
            "regularSchedule": [
                {
                    "day": "thursday",
                    "time": "20:00",
                    "subject": "Blender"
                },
                {
                    "day": "sunday",
                    "time": "14:00",
                    "subject": "Blender"
                }
            ],
            "oneTimeLessons": []
        },
        {
            "id": 7,
            "name": "Лео(Алла)",
            "regularSchedule": [
                {
                    "day": "monday",
                    "time": "18:00",
                    "subject": "Roblox"
                },
                {
                    "day": "friday",
                    "time": "18:00",
                    "subject": "Roblox"
                }
            ],
            "oneTimeLessons": []
        },
        {
            "id": 8,
            "name": "Макар(Анастасия)",
            "regularSchedule": [
                {
                    "day": "tuesday",
                    "time": "18:00",
                    "subject": "Unity"
                },
                {
                    "day": "thursday",
                    "time": "20:00",
                    "subject": "Unity"
                }
            ],
            "oneTimeLessons": []
        }
    ]
};