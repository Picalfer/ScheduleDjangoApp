import * as utils from "./utils.js";

export class SettingsManager {
    constructor(calendarManager) {
        this.calendarManager = calendarManager;
        this.isOpenWindowsMode = false; // Флаг для отслеживания состояния выбора открытых окон
        this.openWindowStates = {}; // Объект для хранения состояния чекбоксов

        this.modal = document.getElementById('settings-modal');
        this.startHourSelect = document.getElementById('start-hour');
        this.endHourSelect = document.getElementById('end-hour');
        this.closeButton = this.modal.querySelector('.close');
        this.cancelButton = this.modal.querySelector('.cancel-button');
        this.submitButton = this.modal.querySelector('.submit-button');
        this.themeSwitch = document.getElementById('theme-switch');
        this.openWindowsButton = document.getElementById('set-open-windows');
        this.openWindowsControls = document.getElementById('open-windows-controls');

        // Загружаем сохраненные настройки
        this.loadSettingsFromServer();

        // Настройка событий и инициализация
        this.setupEventListeners();
        this.initializeTimeOptions();
    }

    async loadSettingsFromServer() {
        try {
            const response = await fetch('/get-user-settings/');
            const data = await response.json();

            // Применяем настройки
            if (data.theme) {
                document.body.classList.toggle('dark-theme', data.theme === 'dark');
                this.themeSwitch.checked = data.theme === 'dark';
            }

            if (data.workingHours) {
                const {start, end} = data.workingHours;
                if (this.isValidWorkingHours(start, end)) {
                    this.calendarManager.updateWorkingHours(start, end);
                }
            }
        } catch (error) {
            console.error('Ошибка при загрузке настроек:', error);
        }
    }

    async saveSettingsToServer(settings) {
        function getCsrfToken() {
            return document.querySelector('[name=csrfmiddlewaretoken]').value;
        }

        try {
            const response = await fetch('/update-user-settings/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': getCsrfToken(),
                },
                body: new URLSearchParams(settings).toString(),
            });
            const data = await response.json();
            console.log('Настройки сохранены:', data);
        } catch (error) {
            console.error('Ошибка при сохранении настроек:', error);
            throw error;
        }
    }

    isValidWorkingHours(startHour, endHour) {
        return (
            !isNaN(startHour) && // Проверяем, что startHour — число
            !isNaN(endHour) && // Проверяем, что endHour — число
            startHour >= 0 && // Начальный час не меньше 0
            endHour <= 23 && // Конечный час не больше 23
            startHour < endHour // Начальный час меньше конечного
        );
    }

    initializeTimeOptions() {
        if (!this.startHourSelect || !this.endHourSelect) {
            console.error('Элементы startHourSelect или endHourSelect не найдены');
            return;
        }

        this.startHourSelect.innerHTML = '';
        this.endHourSelect.innerHTML = '';

        Array.from({length: 24}, (_, i) => {
            const hour = String(i).padStart(2, '0');
            const time = `${hour}:00`;

            this.startHourSelect.add(new Option(time, i));
            this.endHourSelect.add(new Option(time, i));
        });
    }

    open() {
        if (!this.startHourSelect || !this.endHourSelect || !this.modal) {
            console.error('Не найдены необходимые элементы DOM');
            return;
        }

        this.startHourSelect.value = this.calendarManager.startHour;
        this.endHourSelect.value = this.calendarManager.endHour;

        this.modal.classList.add('visible'); // Добавляем класс для видимости
        this.modal.style.display = 'block';

        this.resetModalScroll();
    }

    resetModalScroll() {
        const modalContent = this.modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.scrollTop = 0;
        } else {
            console.warn('Элемент .modal-content не найден');
        }
    }

    close() {
        this.modal.classList.remove('visible');
        this.modal.style.display = 'none';
    }

    setupEventListeners() {
        this.closeButton.onclick = () => this.close();
        this.cancelButton.onclick = () => this.close();

        document.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        this.submitButton.onclick = (e) => this.handleSubmit(e);

        this.themeSwitch.addEventListener('change', () => {
            const theme = this.themeSwitch.checked ? 'dark' : 'light';
            document.body.classList.toggle('dark-theme', this.themeSwitch.checked);
            this.saveSettingsToServer({theme});
        });

        this.openWindowsButton.onclick = (e) => {
            e.preventDefault();
            this.toggleOpenWindows();
            utils.closeConfirmationModal();
        };

        // Обработчик для кнопки "Сохранить открытые окна"
        const saveOpenWindowsButton = document.getElementById('save-open-windows');
        if (saveOpenWindowsButton) {
            saveOpenWindowsButton.onclick = () => utils.showConfirmationModal({
                    text: "Вы уверены, что хотите изменить открытые окна?",
                    onConfirm: () => this.applyOpenSlotsUpdate(),
                    onCancel: () => this.turnOffOpenWindowsMode()
                }
            );
        }
    }

    handleSubmit(e) {
        e.preventDefault();
        const startHour = parseInt(this.startHourSelect.value);
        const endHour = parseInt(this.endHourSelect.value);

        if (!this.isValidWorkingHours(startHour, endHour)) {
            alert('Время начала должно быть меньше времени окончания');
            return;
        }

        // Сохраняем настройки на сервере
        this.saveSettingsToServer({
            working_hours_start: startHour,
            working_hours_end: endHour,
        })
            .then(() => {
                console.log('Рабочие часы успешно сохранены');
                this.calendarManager.updateWorkingHours(startHour, endHour); // Обновляем календарь
                this.close();
            })
            .catch((error) => {
                console.error('Ошибка при сохранении рабочих часов:', error);
                alert('Ошибка при сохранении рабочих часов');
            });
    }

    applyOpenSlotsUpdate() {
        const newOpenSlots = {};
        document.querySelectorAll('.hour.open-window').forEach((hourElement) => {
            const day = hourElement.getAttribute('data-day');
            const hour = hourElement.getAttribute('data-hour');

            if (!newOpenSlots[day]) {
                newOpenSlots[day] = [];
            }

            newOpenSlots[day].push(hour);
        });

        const currentOpenSlots = this.calendarManager.openSlots.weeklyOpenSlots;

        const isChanged = JSON.stringify(newOpenSlots) !== JSON.stringify(currentOpenSlots);
        if (!isChanged) {
            console.log('Открытые окна не изменились');
            utils.showNotification("Открытые окна не изменились", "info");
            this.turnOffOpenWindowsMode();
            return;
        }

        this.calendarManager.openSlots.weeklyOpenSlots = newOpenSlots;

        this.calendarManager.updateOpenSlots(this.calendarManager.openSlots)
            .then(() => {
                console.log('Открытые слоты успешно обновлены');
                this.calendarManager.updateCalendarUi();
                utils.showNotification("Открытые окна успешно сохранены", "success");
            })
            .catch((error) => {
                console.error('Ошибка при обновлении открытых окон:', error);
                utils.showNotification("Ошибка при обновлении открытых окон", "error");
            });

        this.turnOffOpenWindowsMode();
    }

    turnOffOpenWindowsMode() {
        document.querySelectorAll('.open-window-checkbox').forEach((checkbox) => {
            checkbox.remove();
        });

        const selectedCountPanel = document.getElementById('selected-count');
        if (selectedCountPanel) {
            selectedCountPanel.style.display = 'none';
        }

        this.isOpenWindowsMode = false; // Сбрасываем состояние

        if (this.openWindowsControls) {
            this.openWindowsControls.style.display = 'none';
        }
    }

    toggleOpenWindows() {
        console.log("Режим настройки окон переключен");
        this.isOpenWindowsMode = !this.isOpenWindowsMode; // Переключаем состояние

        if (this.openWindowsControls) {
            const isVisible = this.openWindowsControls.style.display === 'block';
            this.openWindowsControls.style.display = isVisible ? 'none' : 'block';
        }

        this.addCheckboxesToHours();

        this.updateSelectedCount();

        this.close();

        const cancelButton = document.getElementById('cancel-open-windows');
        if (cancelButton) {
            cancelButton.onclick = () => this.turnOffOpenWindowsMode();
        }
    }

    addCheckboxesToHours() {
        const hourElements = document.querySelectorAll('.hour');
        hourElements.forEach((hourElement) => {
            const day = hourElement.getAttribute('data-day');
            const hour = hourElement.getAttribute('data-hour');

            const existingCheckbox = hourElement.querySelector('.open-window-checkbox');
            if (existingCheckbox) {
                existingCheckbox.remove();
            }

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'open-window-checkbox';

            checkbox.checked = hourElement.classList.contains('open-window');

            hourElement.appendChild(checkbox);

            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    hourElement.classList.add('open-window');
                } else {
                    hourElement.classList.remove('open-window');
                }

                if (!this.openWindowStates[day]) {
                    this.openWindowStates[day] = [];
                }

                if (checkbox.checked) {
                    if (!this.openWindowStates[day].includes(hour)) {
                        this.openWindowStates[day].push(hour);
                    }
                } else {
                    this.openWindowStates[day] = this.openWindowStates[day].filter(h => h !== hour);
                }

                /*// Сохраняем обновленное состояние в localStorage
                localStorage.setItem('openWindowStates', JSON.stringify(this.openWindowStates));
                */
                // Обновляем количество выбранных ячеек
                this.updateSelectedCount();
            });
        });
    }

    updateSelectedCount() {
        const countElement = document.getElementById('count');
        const selectedCountPanel = document.getElementById('selected-count');

        if (!countElement || !selectedCountPanel) {
            console.error('Элементы count или selected-count не найдены');
            return;
        }

        let selectedCount = 0;

        for (const day in this.openWindowStates) {
            for (const hour in this.openWindowStates[day]) {
                if (this.openWindowStates[day][hour]) {
                    selectedCount++;
                }
            }
        }

        countElement.textContent = selectedCount.toString();
        selectedCountPanel.style.display = selectedCount > 0 ? 'block' : 'none';
    }
}