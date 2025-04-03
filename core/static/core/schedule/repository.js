const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

export function getTeachers() {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await fetch('/teachers/', {
                method: 'GET',
                headers: {'Content-Type': 'application/json'},
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Ошибка ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            resolve(data)
        } catch (error) {
            console.error("Ошибка при получении данных об учителях:", error);
            reject(error);
        }
    })
}

export async function getLessons(teacherId = null, startDate = null, endDate = null) {
    try {
        const params = new URLSearchParams();

        // Важно: убеждаемся, что teacherId - это число
        if (teacherId !== null && !isNaN(teacherId)) {
            params.append('teacher_id', parseInt(teacherId).toString());
        }
        /*
                if (startDate) params.append('date_after', startDate);
                if (endDate) params.append('date_before', endDate);*/

        const response = await fetch(`/lessons/?${params.toString()}`, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to fetch lessons');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching lessons:', error);
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

export async function completeLesson(lessonId, lessonData = {}) {
    try {
        if (!lessonId) {
            throw new Error('Lesson ID is required');
        }
        const csrfToken = getCookie('csrftoken');
        if (!csrfToken) {
            throw new Error('CSRF token not found');
        }

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

export async function cancelLesson(lessonId, reason) {
    try {
        if (!lessonId) {
            throw new Error('Lesson ID is required');
        }
        const csrfToken = getCookie('csrftoken');
        if (!csrfToken) {
            throw new Error('CSRF token not found');
        }

        const payload = {
            cancel_reason: reason || null
        };

        const response = await fetch(`/api/cancel-lesson/${lessonId}/`, {
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
        console.error('Ошибка при отмене урока:', error);
        throw error;
    }
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

export async function createLesson(date, time, teacherId, studentId, subject, lesson_type) {
    try {
        if (!date || !time || !teacherId || !studentId || !subject || !lesson_type) {
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
                lesson_type: lesson_type
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