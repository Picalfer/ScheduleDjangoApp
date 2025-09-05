// static/core/js/pwa.js
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('/static/core/js/service-worker.js')
            .then(function (registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function (err) {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// Показываем кнопку "Установить"
let deferredPrompt;
const installButton = document.getElementById('install-button');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    if (installButton) {
        installButton.style.display = 'block';

        installButton.addEventListener('click', (e) => {
            installButton.style.display = 'none';
            deferredPrompt.prompt();

            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                } else {
                    console.log('User dismissed the install prompt');
                }
                deferredPrompt = null;
            });
        });
    }
});