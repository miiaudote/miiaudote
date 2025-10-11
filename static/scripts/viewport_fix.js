function setViewportHeight() {
	document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`)
}

// Set height on load with delay
window.addEventListener('load', () => {
	setTimeout(setViewportHeight, 100)
})