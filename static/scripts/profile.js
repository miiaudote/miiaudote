import { applied_filters } from "./post_module.js"

function initialize_edit_modal(session) {
	let form_username = document.querySelector("#formUsername")
	let form_email = document.querySelector("#formEmail")
	let form_phone = document.querySelector("#formPhone")

	form_username.value = session.username
	form_email.value = session.email
	form_phone.value = session.phone.replace(/\D/g, "")
	return
}

function initialize_edit_button(page_id) {
	fetch("/api/session")
		.then(function (response) {
			return response.json()
		})
		.then(function (user) {
			if (page_id == user.id) {
				let edit_buttons = document.querySelectorAll("#editBtn")
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

function initialize_messenger_btn(btn) {
	btn.href = `/messenger/${applied_filters.userId}`
	return
}

document.addEventListener("DOMContentLoaded", function() {
	const path = window.location.pathname
	const match = path.split("/")

	const page_id = match[match.length -1]
	applied_filters.userId = Number(page_id)

	document.querySelectorAll("#messengerBtn").forEach(initialize_messenger_btn)
	initialize_edit_button(page_id)
	return
})