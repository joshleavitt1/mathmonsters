const currentScript = document.currentScript;
const rootPath = currentScript?.dataset?.pwaRoot ?? '.';

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    updateInstallMessage('Service workers are not supported on this browser yet.');
    return;
  }

  const swUrl = new URL(`${rootPath}/sw.js`, window.location.href);

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(swUrl.href)
      .catch((error) => {
        console.error('Service worker registration failed', error);
        updateInstallMessage('Unable to enable offline mode. Try refreshing the page.');
      });
  });
}

let deferredPrompt = null;

function setupInstallPrompt() {
  const installButton = document.querySelector('[data-install-button]');
  const installMessage = document.querySelector('[data-install-message]');

  if (!installButton) {
    return;
  }

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  if (installMessage) {
    if (isStandalone) {
      installMessage.textContent = 'All set! MathMonsters is ready on your device.';
    } else if (isIos) {
      installMessage.textContent = 'Tap the share button and choose "Add to Home Screen" to install the app.';
    } else {
      installMessage.textContent = 'Install the app on your device to keep battling monsters offline.';
    }
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installButton.hidden = false;
    if (installMessage) {
      installMessage.textContent = 'Install the app for quick access on your home screen.';
    }
  });

  installButton.addEventListener('click', async () => {
    if (!deferredPrompt) {
      installButton.hidden = true;
      if (installMessage) {
        installMessage.textContent = 'The app is ready to use in your browser.';
      }
      return;
    }

    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === 'accepted') {
      if (installMessage) {
        installMessage.textContent = 'Great! Finish installing MathMonsters from your browser prompt.';
      }
    } else if (installMessage) {
      installMessage.textContent = 'No worries. You can install the app later from your browser menu.';
    }

    deferredPrompt = null;
    installButton.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    if (installMessage) {
      installMessage.textContent = 'All set! MathMonsters is now installed on your device.';
    }
    installButton.hidden = true;
  });
}

function updateInstallMessage(message) {
  const installMessage = document.querySelector('[data-install-message]');
  if (installMessage) {
    installMessage.textContent = message;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  registerServiceWorker();
  setupInstallPrompt();
});
