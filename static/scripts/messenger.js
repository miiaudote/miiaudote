// Global variables
let sessionData = null
let recipientId = null

// Internal functions
function handleMessaging() {
	let textAreas = document.querySelectorAll("#messageTextArea")
	textAreas.forEach(function (chat) {
		if (chat.disabled || chat.value.trim() === '') {
			return
		}
		fetch("/api/messenger/send", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				sender: sessionData.id,
				recipient: recipientId,
				content: chat.value
			})
		}).finally(updateMessages)
		chat.value = ""
	})
}

function handleContactClick(event) {
	let contact = event.currentTarget
	let contactId = contact.getAttribute("contact-id")
	window.location.replace(`${contactId}`)
}

function handleChatInput(event) {
	let chat = event.currentTarget
	chat.style.height = 'auto'
	chat.style.height = chat.scrollHeight + 'px'
}

function handleChatFunctions(event) {
	const textArea = event.currentTarget
	if (event.key === 'Enter') {
		if (event.shiftKey) {
			// Shift+Enter → add new line
     		textArea.setRangeText('\n', textArea.selectionStart, textArea.selectionEnd, 'end')
			handleChatInput(event)
		} else {
			// Enter → trigger button click
			handleMessaging()
		}
		event.preventDefault()
	}
}

function toggleChatInput() {
	let textAreas = document.querySelectorAll("#messageTextArea")
	textAreas.forEach(function (chat) {
		if (recipientId === sessionData.id) {
			chat.disabled = true
		} else {
			chat.addEventListener('input', handleChatInput)
			chat.addEventListener('keydown', handleChatFunctions)
		}
	})

	let messageButtons = document.querySelectorAll("#sendMessageBtn")
	messageButtons.forEach(function (button) {
		if (recipientId === sessionData.id) {
			button.disabled = true
		} else {
			button.addEventListener('click', handleMessaging)
		}
	})
}

async function getUserInfo(id) {
	try {
		const response = await fetch(`/api/user/${id}`)
		const userInfo = await response.json()
		return userInfo
	} catch (error) {
		console.error("Error fetching user info:", error)
		return null
	}
}

async function updateSession() {
	try {
		const response = await fetch("/api/session")
		const user = await response.json()
		sessionData = user

		const path = window.location.pathname
		const match = path.split("/")
		const pageId = match[match.length - 1]
		recipientId = Number(pageId)
	} catch (error) {
		console.error("Error fetching session:", error)
	}
}

async function updateContacts() {
	const contactTemplate = document.querySelector("#contactTemplate")
	const contactsBars = document.querySelectorAll("#contactsBar")

	for (const contactBar of contactsBars) {
		const fragment = document.createDocumentFragment()

		for (const contact of (await getUserInfo(sessionData.id)).contacts) {
			const userInfo = await getUserInfo(contact)
			if (!userInfo) continue

			const clone = contactTemplate.content.cloneNode(true)
			const contactElement = clone.firstElementChild

			if (contact === recipientId) {
				let cloneDiv = clone.firstElementChild
				cloneDiv.classList.remove("btn-dark")
				cloneDiv.classList.add("btn-primary")
			}

			const contactImg = clone.querySelector("#contactImg")
			const contactName = clone.querySelector("#contactName")

			contactImg.src = `/api/uploads/profile_pictures/${contact}`
			contactName.innerText = userInfo.username

			contactElement.setAttribute("contact-id", contact)
			contactElement.addEventListener("click", handleContactClick)

			fragment.appendChild(clone)
		}

		contactBar.replaceChildren(fragment)
	}
}

async function updateMessages() {
	let chatContainers = document.querySelectorAll("#chatContainer")
	let senderTemplate = document.querySelector("#senderTemplate")
	let recipientTemplate = document.querySelector("#recipientTemplate")

	const [currentUserMessages, recipientMessages] = await Promise.all([
		(await fetch(`/api/messenger/request/${sessionData.id}/${recipientId}`)).json(),
		(await fetch(`/api/messenger/request/${recipientId}/${sessionData.id}`)).json()
	])

	let orderedMessages = currentUserMessages.concat(recipientMessages).sort((a, b) => a.id - b.id)

	chatContainers.forEach(chatContainer => {
		chatContainer.innerHTML = ""
		orderedMessages.forEach(message => {
			let template = message.sender_id === sessionData.id ? senderTemplate : recipientTemplate
			let clone = template.content.cloneNode(true)
			clone.querySelector("#messageBubble").innerText = message.content
			clone.querySelector("#messageImg").src = `/api/uploads/profile_pictures/${message.sender_id}`
			chatContainer.appendChild(clone)
		})
	})
}

document.addEventListener("DOMContentLoaded", function () {
	updateSession().finally(function () {
		setInterval(updateContacts, 1000)
		setInterval(updateMessages, 1000)
		setInterval(updateSession, 1000)
		toggleChatInput()
		updateContacts()
		updateMessages()
	})
})