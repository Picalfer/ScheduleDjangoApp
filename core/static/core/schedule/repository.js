export class Repository {
    constructor() {
        this.csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
        this.currentUserId = window.currentUserId;
    }

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    async getTeachers() {
        try {
            const response = await fetch('/teachers/', {
                method: 'GET',
                headers: {'Content-Type': 'application/json'},
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Ошибка ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Ошибка при получении данных об учителях:", error);
            throw error;
        }
    }

    async getLessons(teacherId = null, startDate = null, endDate = null) {
        try {
            const params = new URLSearchParams();

            if (teacherId !== null && !isNaN(teacherId)) {
                params.append('teacher_id', parseInt(teacherId).toString());
            }

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

    async getOpenSlots(teacherId = this.currentUserId) {
        try {
            const response = await fetch(`/api/open-slots/${teacherId}/`);
            if (!response.ok) {
                throw new Error(`Ошибка: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            console.log('Open slots: ', data.weekly_open_slots);
            return data.weekly_open_slots;
        } catch (error) {
            console.error("Ошибка при получении свободных слотов:", error);
            throw error;
        }
    }

    async updateOpenSlots(openSlots, teacherId = this.currentUserId) {
        try {
            const response = await fetch(`/api/open-slots/${teacherId}/update/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.csrfToken,
                },
                body: JSON.stringify({weekly_open_slots: openSlots}),
            });

            if (!response.ok) {
                throw new Error(`Ошибка: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.weekly_open_slots;
        } catch (error) {
            console.error("Ошибка при обновлении свободных слотов:", error);
            throw error;
        }
    }

    async completeLesson(lessonId, lessonData = {}) {
        try {
            if (!lessonId) {
                throw new Error('Lesson ID is required');
            }

            const csrfToken = this.getCookie('csrftoken');
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

    async cancelLesson(lessonId, reason) {
        try {
            if (!lessonId) {
                throw new Error('Lesson ID is required');
            }

            const csrfToken = this.getCookie('csrftoken');
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

    async createLesson(date, time, teacherId, studentId, subject, lesson_type) {
        try {
            if (!date || !time || !teacherId || !studentId || !subject || !lesson_type) {
                throw new Error('Missing required fields');
            }

            const response = await fetch('/api/create-lesson/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.csrfToken,
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
}