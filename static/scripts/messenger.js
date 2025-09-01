// Global variables
let sessionData = null
let recipientId = null
let existingContacts = new Map() // Track existing contact elements
let existingMessages = new Map() // Track existing message elements

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
		const response = await fetch("/api/current_user")
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
	const currentContacts = new Set()

	// Fetch current contacts
	const contacts = (await getUserInfo(sessionData.id))?.contacts || []

	for (const contactBar of contactsBars) {
		for (const contact of contacts) {
			currentContacts.add(contact)
			if (existingContacts.has(contact)) {
				// Update existing contact
				const contactElement = existingContacts.get(contact)
				const userInfo = await getUserInfo(contact)
				if (!userInfo) continue

				const contactImg = contactElement.querySelector("#contactImg")
				const contactName = contactElement.querySelector("#contactName")
				contactImg.src = `/api/uploads/profile_pictures/${contact}`
				contactName.innerText = userInfo.username

				// Update styling based on recipientId
				contactElement.classList.toggle("btn-dark", contact !== recipientId)
				contactElement.classList.toggle("btn-primary", contact === recipientId)
			} else {
				// Create new contact
				const userInfo = await getUserInfo(contact)
				if (!userInfo) continue

				const clone = contactTemplate.content.cloneNode(true)
				const contactElement = clone.firstElementChild

				const contactImg = clone.querySelector("#contactImg")
				const contactName = clone.querySelector("#contactName")
				contactImg.src = `/api/uploads/profile_pictures/${contact}`
				contactName.innerText = userInfo.username

				contactElement.setAttribute("contact-id", contact)
				contactElement.addEventListener("click", handleContactClick)
				if (contact === recipientId) {
					contactElement.classList.remove("btn-dark")
					contactElement.classList.add("btn-primary")
				}

				contactBar.appendChild(clone)
				existingContacts.set(contact, contactElement)
			}
		}

		// Remove deleted contacts
		for (const [contactId, contactElement] of existingContacts) {
			if (!currentContacts.has(contactId)) {
				contactElement.remove()
				existingContacts.delete(contactId)
			}
		}
	}
}

async function updateMessages() {
	const chatContainers = document.querySelectorAll("#chatContainer")
	const senderTemplate = document.querySelector("#senderTemplate")
	const recipientTemplate = document.querySelector("#recipientTemplate")
	const currentMessages = new Set()

	// Fetch messages
	const [currentUserMessages, recipientMessages] = await Promise.all([
		(await fetch(`/api/messenger/request/${sessionData.id}/${recipientId}`)).json(),
		(await fetch(`/api/messenger/request/${recipientId}/${sessionData.id}`)).json()
	])
	const orderedMessages = currentUserMessages.concat(recipientMessages).sort((a, b) => a.id - b.id)

	for (const chatContainer of chatContainers) {
		for (const message of orderedMessages) {
			currentMessages.add(message.id)
			if (existingMessages.has(message.id)) {
				// Update existing message
				const messageElement = existingMessages.get(message.id)
				const messageBubble = messageElement.querySelector("#messageBubble")
				const messageImg = messageElement.querySelector("#messageImg")
				messageBubble.innerText = message.content
				messageImg.src = `/api/uploads/profile_pictures/${message.sender_id}`
			} else {
				// Create new message
				const template = message.sender_id === sessionData.id ? senderTemplate : recipientTemplate
				const clone = template.content.cloneNode(true)
				clone.querySelector("#messageBubble").innerText = message.content
				clone.querySelector("#messageImg").src = `/api/uploads/profile_pictures/${message.sender_id}`
				chatContainer.appendChild(clone)
				existingMessages.set(message.id, clone.firstElementChild)
			}
		}

		// Remove deleted messages
		for (const [messageId, messageElement] of existingMessages) {
			if (!currentMessages.has(messageId)) {
				messageElement.remove()
				existingMessages.delete(messageId)
			}
		}
	}
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