const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

export async function completeLesson(lessonId, lessonData = {}) {
    try {
        const csrfToken = getCookie('csrftoken');
        if (!csrfToken) {
            throw new Error('CSRF token not found');
        }

        // Преобразуем пустые строки в null
        const payload = {
            lesson_topic: lessonData.topic || null,
            lesson_notes: lessonData.notes || null,
            homework: lessonData.homework || null
        };

        const response = await fetch(`/api/complete-lesson/${lessonId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Ошибка при завершении урока:', error);
        throw error;
    }
}

// Функция для получения куки
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

export async function createLesson(date, time, teacherId, studentId, subject, isRecurring = false) {
    try {
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

export async function getLessons({teacherId = null, startDate, endDate} = {}) {
    try {
        const params = new URLSearchParams();

        // Добавляем teacher_id только если он указан
        if (teacherId) {
            params.append('teacher_id', teacherId);
        }

        // Добавляем даты
        if (startDate) params.append('date_after', startDate);
        if (endDate) params.append('date_before', endDate);

        const response = await fetch(`/lessons/?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Ошибка: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Ошибка при получении уроков:", error);
        throw error;
    }
}

export function updateSchedule(scheduleData, teacherId = null) {
    return true
}

export function getSchedule(teacherId = currentUserId) {
    return new Promise(async (resolve, reject) => {
        resolve(getLessons())
    });
}

export function getClientByID(clientId) {
    return new Promise((resolve, reject) => {
        resolve("true шо")
    });
}

export function getTeacherByID(teacherId) {
    return new Promise((resolve, reject) => {
        resolve("true шо")
    });
}