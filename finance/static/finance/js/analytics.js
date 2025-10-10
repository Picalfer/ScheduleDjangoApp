// Переключение детализации
function toggleFinanceDetails() {
    const details = document.getElementById('financeDetails');
    const button = document.querySelector('.toggle-details-btn');
    const icon = button.querySelector('.toggle-icon');

    if (details.classList.contains('hidden')) {
        // Показываем с анимацией
        details.classList.remove('hidden');
        button.classList.add('expanded');
        button.innerHTML = '<span class="toggle-icon">▼</span> Скрыть детализацию';

        // Плавное появление
        setTimeout(() => {
            details.style.opacity = '1';
            details.style.transform = 'translateY(0)';
        }, 10);
    } else {
        // Скрываем с анимацией
        details.style.opacity = '0';
        details.style.transform = 'translateY(-10px)';

        setTimeout(() => {
            details.classList.add('hidden');
            button.classList.remove('expanded');
            button.innerHTML = '<span class="toggle-icon">▼</span> Показать детализацию';
        }, 300);
    }
}

// Модальное окно расходов
function openExpenseModal() {
    document.getElementById('expenseModal').style.display = 'block';
    const today = new Date().toISOString().split('T')[0];
    document.querySelector('input[name="expense_date"]').value = today;
}

function closeExpenseModal() {
    document.getElementById('expenseModal').style.display = 'none';
    document.getElementById('expenseForm').reset();
}

// Уведомления
function showNotification(message, type) {
    const notification = document.getElementById('expenseNotification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');

    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

// Обработка формы добавления расхода
function handleExpenseFormSubmit(e) {
    e.preventDefault();

    const formData = new FormData(this);
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    try {
        submitBtn.textContent = 'Сохранение...';
        submitBtn.disabled = true;

        fetch('/stats/add-expense/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            }
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('✅ Расход успешно добавлен!', 'success');
                    closeExpenseModal();
                    setTimeout(() => location.reload(), 1000);
                } else {
                    showNotification('❌ Ошибка: ' + data.error, 'error');
                }
            })
            .catch(error => {
                showNotification('❌ Ошибка сети', 'error');
            })
            .finally(() => {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            });

    } catch (error) {
        showNotification('❌ Ошибка', 'error');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Закрытие модального окна при клике вне его
function handleModalClick(event) {
    const modal = document.getElementById('expenseModal');
    if (event.target === modal) {
        closeExpenseModal();
    }
}

// Функции для отладки
function loadIncomeDetails() {
    fetch('/stats/income-details/')
        .then(response => response.json())
        .then(data => {
            document.getElementById('debugDetails').innerHTML = data.html;
        })
        .catch(error => {
            document.getElementById('debugDetails').innerHTML = '<p style="color: red;">Ошибка загрузки</p>';
        });
}

function loadTeacherPayments() {
    fetch('/stats/teacher-payments-details/')
        .then(response => response.json())
        .then(data => {
            document.getElementById('debugDetails').innerHTML = data.html;
        })
        .catch(error => {
            document.getElementById('debugDetails').innerHTML = '<p style="color: red;">Ошибка загрузки</p>';
        });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
    const expenseForm = document.getElementById('expenseForm');
    if (expenseForm) {
        expenseForm.addEventListener('submit', handleExpenseFormSubmit);
    }

    // Вешаем обработчик на window для модального окна
    window.addEventListener('click', handleModalClick);
});