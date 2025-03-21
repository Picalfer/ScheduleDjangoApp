console.log("Hello from JavaScript!");

document.getElementById('fetchDataButton').addEventListener('click', function () {
    // Отправляем GET-запрос на бэкенд
    fetch('/get-data/')
        .then(response => response.json())  // Преобразуем ответ в JSON
        .then(data => {
            // Отображаем результат на странице
            document.getElementById('result').textContent = data.message;
        })
        .catch(error => {
            console.error('Ошибка:', error);
        });
});