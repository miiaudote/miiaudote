// Global variables
let isStandaloneMode = window.matchMedia('(display-mode: standalone)')
let isFullscreenMode = window.matchMedia('(display-mode: fullscreen)')

let deferredPrompt

// Root conditions
if (window.matchMedia('(display-mode: standalone)').matches || 
    window.matchMedia('(display-mode: fullscreen)').matches || 
    window.navigator.standalone === true) {
    handlePwa()
}

// Functions
function handlePwa() {
    window.location.replace("dashboard")
}

// Events
isFullscreenMode.addEventListener("change", handlePwa)
isStandaloneMode.addEventListener("change", handlePwa)

window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event
})

document.addEventListener("DOMContentLoaded", function () {
    let installButton = document.getElementById("installBtn")
    installButton.addEventListener("click", function() {
        if (deferredPrompt) {
            deferredPrompt.prompt()
        }
    })
})