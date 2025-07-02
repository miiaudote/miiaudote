import { applied_filters, fetch_posts } from "./post_module.js"

function initialize_edit_modal(session) {
	let form_username = document.querySelector("#form_username")
	let form_email = document.querySelector("#form_email")
	let form_phone = document.querySelector("#form_phone")

	form_username.value = session.username
	form_email.value = session.email
	form_phone.value = session.phone.replace(/\D/g, "")
	return
}

function initialize_edit_button(page_id) {
	fetch("/session")
		.then(function (response) {
			return response.json()
		})
		.then(function (user) {
			if (page_id == user.id) {
				let edit_buttons = document.querySelectorAll("#edit_btn")
				edit_buttons.forEach(function (element) {
					element.classList.remove("d-none")
					return
				})
				initialize_edit_modal(user)
			}
			return
		})
		.catch(function (error) {
			console.error("Erro ao buscar a sessão:", error)
			return
		})
	return
}

document.addEventListener("DOMContentLoaded", function () {
	const path = window.location.pathname
	const match = path.split("/")

	const page_id = match[match.length - 1]
	applied_filters.owner = Number(page_id)

	setInterval(fetch_posts, 3000)
	fetch_posts()

	initialize_edit_button(page_id)
	return
})