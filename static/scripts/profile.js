import { applied_filters, fetch_posts } from "./post_module.js"

document.addEventListener("DOMContentLoaded", function () {
	const path = window.location.pathname
	const match = path.match(/^\/profile\/([^/]+)$/)

	if (match) {
		const id = match[1]
		applied_filters.owner = Number(id)
	}

	setInterval(fetch_posts, 3000)
	fetch_posts()
	return
})