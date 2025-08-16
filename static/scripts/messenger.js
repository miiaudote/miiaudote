let session_data = null
let recipient_id = null

// INTERNALS:
function _on_messaging() {
	let text_areas = document.querySelectorAll("#messageTextArea")
	text_areas.forEach(function (chat) {
		if (chat.disabled) {
			return
		}
		fetch("/api/messenger/send", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				sender: session_data.id,
				recipient: recipient_id,
				content: chat.value
			})
		}).finally(_update_messages)
		chat.value = ""
		return
	})
	return
}

function _on_contact_click(event) {
	let contact = event.currentTarget
	let contact_id = contact.getAttribute("contact-id")
	window.location.replace(`${contact_id}`)
	return
}

function _on_chat_input(event) {
	let chat = event.currentTarget
	chat.style.height = 'auto';
	chat.style.height = chat.scrollHeight + 'px';
	return
}

function _enable_disable_chat() {
	let text_areas = document.querySelectorAll("#messageTextArea")
	text_areas.forEach(function (chat) {
		if (recipient_id == session_data.id) {
			chat.disabled = true
		}
		else {
			chat.addEventListener('input', _on_chat_input)
		}
		return
	})

	let message_btns = document.querySelectorAll("#sendMessageBtn")
	message_btns.forEach(function (button) {
		if (recipient_id == session_data.id) {
			button.disabled = true
		}
		else {
			button.addEventListener('click', _on_messaging)
		}
		return
	})
	return
}

async function _get_user_info(id) {
	try {
		const response = await fetch(`/api/user/${id}`)
		const user_info = await response.json()
		return user_info
	} catch (error) {
		console.error("Erro ao buscar a sessão:", error)
		return null
	}
}

async function _update_session() {
	return fetch("/api/session")
		.then(function (response) {
			return response.json()
		})
		.then(function (user) {
			session_data = user

			const path = window.location.pathname
			const match = path.split("/")

			const page_id = match[match.length - 1]
			recipient_id = Number(page_id)
			return
		})
		.catch(function (error) {
			console.error("Erro ao buscar a sessão:", error)
			return
		})
}

async function _update_contacts() {
	const contact_template = document.querySelector("#contactTemplate")
	const contacts_bars = document.querySelectorAll("#contactsBar")

	for (const contact_bar of contacts_bars) {
		// build new content in a fragment
		const fragment = document.createDocumentFragment()

		for (const contact of (await _get_user_info(session_data.id)).contacts) {
			const user_info = await _get_user_info(contact)
			if (!user_info) continue

			const clone = contact_template.content.cloneNode(true)
			const contactElement = clone.firstElementChild

			if (contact == recipient_id) {
				let cloneDiv = clone.firstElementChild
				cloneDiv.classList.remove("btn-dark")
				cloneDiv.classList.add("btn-primary")
			}

			const contactImg = clone.querySelector("#contactImg")
			const contactName = clone.querySelector("#contactName")

			contactImg.src = `/api/uploads/profile_pictures/${contact}`
			contactName.innerText = user_info.username

			contactElement.setAttribute("contact-id", contact)
			contactElement.addEventListener("click", _on_contact_click)

			fragment.appendChild(clone)
		}

		// replace old DOM in one go
		contact_bar.replaceChildren(fragment)
	}
}

async function _update_messages() {
	let chatContainers = document.querySelectorAll("#chatContainer")
	let senderTemplate = document.querySelector("#senderTemplate")
	let recipientTemplate = document.querySelector("#recipientTemplate")

	// current user messages TO the recipient
	// recipient messages TO the current user
	const [current_user_messages, recipient_messages] = await Promise.all([
		(await fetch(`/api/messenger/request/${session_data.id}/${recipient_id}`)).json(),
		(await fetch(`/api/messenger/request/${recipient_id}/${session_data.id}`)).json()
	])

	// merge and sort messages by ID
	let ordered_messages = current_user_messages.concat(recipient_messages).sort((a, b) => a.id - b.id)

	chatContainers.forEach(chatContainer => {
		// clear previous messages
		chatContainer.innerHTML = ""
		ordered_messages.forEach(message => {
			let template = message.senderId == session_data.id ? senderTemplate : recipientTemplate
			let clone = template.content.cloneNode(true)
			// set the message text
			clone.querySelector("#messageBubble").innerText = message.content
			// set the sender/recipient picture
			clone.querySelector("#messageImg").src = `/api/uploads/profile_pictures/${message.senderId}`
			chatContainer.appendChild(clone)
		})
	})
}

document.addEventListener("DOMContentLoaded", function () {
	_update_session().finally(function () {
		setInterval(_update_contacts, 1000)
		setInterval(_update_messages, 1000)
		setInterval(_update_session, 1000)
		_enable_disable_chat()
		_update_contacts()
		_update_messages()
		return
	})
	return
})