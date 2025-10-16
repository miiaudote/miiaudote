function detectNotch() {
	if (!window.visualViewport) return false

	const diffTop = window.visualViewport.offsetTop
	const diffBottom = window.innerHeight - (window.visualViewport.height + window.visualViewport.offsetTop)

	// If there's extra space at the top or bottom likely a notch or rounded corner
	return diffTop > 0 || diffBottom > 0
}

function setViewportHeight() {
	document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`)
}

// Set height on load with delay
window.addEventListener('load', () => {
	setTimeout(setViewportHeight, 300)
})