import * as utils from "./utils.js";

export class SettingsManager {
    constructor(calendar) {
        this.calendar = calendar;

        this.initializeDOMElements();

        // Инициализация состояния
        this.isOpenWindowsMode = false; // Флаг для отслеживания состояния выбора открытых окон
        this.openWindowStates = {}; // Объект для хранения состояния чекбоксов

        // Загружаем сохраненные настройки
        this.loadSavedSettings();

        // Настройка событий и инициализация
        this.setupEventListeners();
        this.initializeTimeOptions();
    }

    initializeDOMElements() {
        this.modal = document.getElementById('settings-modal');
        this.startHourSelect = document.getElementById('start-hour');
        this.endHourSelect = document.getElementById('end-hour');
        this.closeButton = this.modal.querySelector('.close');
        this.cancelButton = this.modal.querySelector('.cancel-button');
        this.submitButton = this.modal.querySelector('.submit-button');
        this.themeSwitch = document.getElementById('theme-switch');
        this.openWindowsButton = document.getElementById('set-open-windows');
        this.openWindowsControls = document.getElementById('open-windows-controls');
    }

    loadSavedSettings() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) { // Проверяем, что тема сохранена
            document.body.classList.toggle('dark-theme', savedTheme === 'dark');
            this.themeSwitch.checked = savedTheme === 'dark';
        }

        // Загружаем сохраненные часы
        const savedStartHour = localStorage.getItem('startHour');
        const savedEndHour = localStorage.getItem('endHour');

        if (savedStartHour && savedEndHour) {
            const startHour = parseInt(savedStartHour, 10); // Указываем систему счисления (10)
            const endHour = parseInt(savedEndHour, 10);

            // Проверяем валидность сохраненных значений
            if (this.isValidWorkingHours(startHour, endHour)) {
                this.calendar.updateWorkingHours(startHour, endHour);
            }
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
        // Проверяем, что элементы select существуют
        console.log("test3")
        if (!this.startHourSelect || !this.endHourSelect) {
            console.error('Элементы startHourSelect или endHourSelect не найдены');
            return;
        }

        // Очищаем существующие опции
        this.startHourSelect.innerHTML = '';
        this.endHourSelect.innerHTML = '';

        // Создаем опции для каждого часа
        Array.from({length: 24}, (_, i) => {
            const hour = String(i).padStart(2, '0');
            const time = `${hour}:00`;

            // Создаем опции для startHourSelect и endHourSelect
            this.startHourSelect.add(new Option(time, i));
            this.endHourSelect.add(new Option(time, i));
        });
    }

    open() {
        // Проверяем, что элементы существуют
        if (!this.startHourSelect || !this.endHourSelect || !this.modal) {
            console.error('Не найдены необходимые элементы DOM');
            return;
        }

        // Устанавливаем текущие значения
        this.startHourSelect.value = this.calendar.startHour;
        this.endHourSelect.value = this.calendar.endHour;

        // Открываем модальное окно
        this.modal.classList.add('visible'); // Добавляем класс для видимости
        this.modal.style.display = 'block';

        // Сбрасываем положение скролла
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

        // Обработчик для закрытия модального окна при клике вне его
        document.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Обработчик для кнопки "Сохранить"
        this.submitButton.onclick = (e) => this.handleSubmit(e);

        // Обработчик для переключения темы
        this.themeSwitch.addEventListener('change', () => this.toggleTheme());

        // Обработчик для кнопки "Открытые окна"
        this.openWindowsButton.onclick = (e) => {
            e.preventDefault();
            this.toggleOpenWindows();
            // Закрываем модальное окно
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

        if (startHour < endHour) {
            if (startHour === this.calendar.startHour && endHour === this.calendar.endHour) {
                console.log('Настройки не изменились');
            } else {
                // Обновляем настройки в scheduleData
                this.calendar.scheduleData.settings.workingHours.start = startHour;
                this.calendar.scheduleData.settings.workingHours.end = endHour;

                // Обновляем данные в Битриксе
                this.calendar.updateSchedule()
                    .then(() => {
                        this.calendar.updateWorkingHours(startHour, endHour);
                    })
                    .catch((error) => {
                        console.error('Ошибка при обновлении расписания:', error);
                    });
            }

            this.close();
        } else {
            alert('Время начала должно быть меньше времени окончания');
        }
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

        const currentOpenSlots = this.calendar.scheduleData.weeklyOpenSlots;

        const isChanged = JSON.stringify(newOpenSlots) !== JSON.stringify(currentOpenSlots);
        if (!isChanged) {
            console.log('Открытые окна не изменились');
            utils.showNotification("Открытые окна не изменились", "info");
            this.turnOffOpenWindowsMode();
            return;
        }

        // Обновляем данные в scheduleData
        this.calendar.scheduleData.weeklyOpenSlots = newOpenSlots;

        // Отправляем обновленные данные на сервер
        this.calendar.updateSchedule(this.calendar.scheduleData)
            .then(() => {
                console.log('Открытые слоты успешно обновлены');
                // Перерисовываем календарь с новыми данными
                this.calendar.updateCalendarUi();
                utils.showNotification("Открытые окна успешно сохранены", "success");
            })
            .catch((error) => {
                console.error('Ошибка при обновлении открытых окон:', error);
                utils.showNotification("Ошибка при обновлении открытых окон", "error");
            });

        // Выключаем режим редактирования
        this.turnOffOpenWindowsMode();
    }

    toggleTheme() {
        if (this.themeSwitch.checked) {
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
        }
    }

    turnOffOpenWindowsMode() {
        document.querySelectorAll('.open-window-checkbox').forEach((checkbox) => {
            checkbox.remove();
        });

        // Скрываем панель "Открытых окон"
        const selectedCountPanel = document.getElementById('selected-count');
        if (selectedCountPanel) {
            selectedCountPanel.style.display = 'none';
        }

        this.isOpenWindowsMode = false; // Сбрасываем состояние

        // Скрываем контролы
        if (this.openWindowsControls) {
            this.openWindowsControls.style.display = 'none';
        }
    }

    toggleOpenWindows() {
        console.log("Режим настройки окон переключен");
        this.isOpenWindowsMode = !this.isOpenWindowsMode; // Переключаем состояние

        // Переключаем видимость контролов
        if (this.openWindowsControls) {
            const isVisible = this.openWindowsControls.style.display === 'block';
            this.openWindowsControls.style.display = isVisible ? 'none' : 'block';
        }

        // Добавляем чекбоксы
        this.addCheckboxesToHours();

        // Обновляем количество выбранных ячеек
        this.updateSelectedCount();

        // Закрываем модальное окно настроек
        this.close();

        // Обработчик для кнопки "Отмена"
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

            // Удаляем старый чекбокс, если он уже был добавлен
            const existingCheckbox = hourElement.querySelector('.open-window-checkbox');
            if (existingCheckbox) {
                existingCheckbox.remove();
            }

            // Создаем чекбокс
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'open-window-checkbox';

            // Устанавливаем состояние чекбокса в зависимости от наличия класса open-window
            checkbox.checked = hourElement.classList.contains('open-window');

            // Добавляем чекбокс в элемент
            hourElement.appendChild(checkbox);

            // Обработчик изменения состояния чекбокса
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    hourElement.classList.add('open-window');
                } else {
                    hourElement.classList.remove('open-window');
                }

                // Пересохраняем состояние в this.openWindowStates
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

                // Сохраняем обновленное состояние в localStorage
                localStorage.setItem('openWindowStates', JSON.stringify(this.openWindowStates));

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

        // Считаем количество выбранных ячеек
        for (const day in this.openWindowStates) {
            for (const hour in this.openWindowStates[day]) {
                if (this.openWindowStates[day][hour]) {
                    selectedCount++;
                }
            }
        }

        countElement.textContent = selectedCount.toString(); // Обновляем текст
        selectedCountPanel.style.display = selectedCount > 0 ? 'block' : 'none'; // Показываем или скрываем панель
    }
}