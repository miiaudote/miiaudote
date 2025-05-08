// GLOBAL VARIABLES

let standalone_mode = window.matchMedia('(display-mode: standalone)')
let fullscreen_mode = window.matchMedia('(display-mode: fullscreen)')

let deferredEvent

// ROOT CONDITIONS

if (window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || (window.navigator.standalone === true)) {
	on_pwa()
}

// FUNCTIONS

function on_pwa() {
	window.location.replace("dashboard")
	return
}

// EVENTS

fullscreen_mode.addEventListener("change", on_pwa)
standalone_mode.addEventListener("change", on_pwa)

window.addEventListener('beforeinstallprompt', (e) => {
	e.preventDefault()
	deferredEvent = e
})

document.addEventListener("DOMContentLoaded", function () {
	let install_btn = document.getElementById("install_btn")
	install_btn.addEventListener("click", function() {
		if (deferredEvent) {
			deferredEvent.prompt()
		}
		return
	})
	return
})