const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

export async function createLesson(date, time, teacherId, studentId, subject, isRecurring = false) {
    try {
        // Проверка данных перед отправкой
        if (!date || !time || !teacherId || !studentId || !subject) {
            throw new Error('Missing required fields');
        }

        const response = await fetch('/api/create-lesson/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
            },
            body: JSON.stringify({
                date: date,
                time: time,
                teacher_id: teacherId,
                student_id: studentId,
                subject: subject,
                is_recurring: isRecurring
            }),
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error || `HTTP error! status: ${response.status}`);
        }

        return responseData;
    } catch (error) {
        console.error('Error creating lesson:', error);
        throw error;
    }
}

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

export async function getLessons(teacherId, startDate, endDate) {
    try {
        const response = await fetch(`/timeslots/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Ошибка: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(data.results)
        return data;
    } catch (error) {
        console.error("Ошибка при получении уроков:", error);
        throw error;
    }
}

async function cancelLesson(lessonId, date) {
    try {
        const response = await fetch('/api/cancel-lesson/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,  // CSRF-токен, если используется
            },
            body: JSON.stringify({
                lesson_id: lessonId,
                date: date,
            }),
        });

        if (!response.ok) {
            throw new Error(`Ошибка: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Ошибка при отмене урока:", error);
        throw error;
    }
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

/*
async function rescheduleLesson(lessonId, date, newTime) {
    try {
        const response = await fetch('/api/reschedule-lesson/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,  // CSRF-токен, если используется
            },
            body: JSON.stringify({
                lesson_id: lessonId,
                date: date,
                new_time: newTime,
            }),
        });

        if (!response.ok) {
            throw new Error(`Ошибка: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Ошибка при переносе урока:", error);
        throw error;
    }
}*/

export function getSchedule(teacherId = currentUserId) {
    return new Promise(async (resolve, reject) => {
        resolve(getLessons())
    });
}

export function updateLessonBalance(clientId, newBalance) {
    return new Promise((resolve, reject) => {
        resolve("заглушка")
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