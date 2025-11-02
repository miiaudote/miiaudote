// Global variables
let sessionData = null
let recipientId = null
let isSessionLoading = false // Flag to control session loading
let isMessagingInProgress = false // Flag to prevent overlapping message sends

// Internal functions
async function handleMessaging() {
    // Prevent sending multiple messages simultaneously
    if (isMessagingInProgress) return
    isMessagingInProgress = true

    try {
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

            chat.value = "" // Clear the chat input
        })
        updateContacts()
    } finally {
        isMessagingInProgress = false // Allow future messaging
    }
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
            textArea.setRangeText('\n', textArea.selectionStart, textArea.selectionEnd, 'end')
            handleChatInput(event)
        } else {
            handleMessaging()
        }
        event.preventDefault()
    }
}

function toggleChatInput(value) {
    let textAreas = document.querySelectorAll("#messageTextArea")
    textAreas.forEach(function (chat) {
        if (recipientId === sessionData.id) {
            chat.disabled = value ? value : true
        } else {
            chat.addEventListener('input', handleChatInput)
            chat.addEventListener('keydown', handleChatFunctions)
        }
    })

    let messageButtons = document.querySelectorAll("#sendMessageBtn")
    messageButtons.forEach(function (button) {
        if (recipientId === sessionData.id) {
            button.disabled = value ? value : true
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
    if (isSessionLoading) return // Prevent concurrent session fetches
    isSessionLoading = true

    try {
        const response = await fetch("/api/current_user")
        const user = await response.json()
        sessionData = user

        const path = window.location.pathname
        const match = path.split("/")
        const pageId = match[match.length - 1]
        recipientId = Number(pageId)

        const recipientInfo = await getUserInfo(recipientId)
        if (!recipientInfo || recipientInfo.length === 0) {
            window.location.replace("/dashboard")
        }
    } catch (error) {
        console.error("Error fetching session:", error)
    } finally {
        isSessionLoading = false
    }
}

async function updateContacts() {
    const contactTemplate = document.querySelector("#contactTemplate")
    const contactsBars = document.querySelectorAll("#contactsBar")

    const userInfo = await getUserInfo(sessionData.id)
    if (!userInfo || userInfo.length === 0) return

    // Create a set of current contact IDs for comparison
    for (const contactBar of contactsBars) {
        const currentContacts = new Set(
            Array.from(contactBar.children).map(c => Number(c.getAttribute("contact-id")))
        )

        const response = await fetch("/api/messenger/get_contacts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: userInfo.id,
            })
        })

        const userContacts = await response.json()
        const newContacts = new Set(userContacts)
        newContacts.add(recipientId)

        // Add new contacts (if not already present)
        for (const contact of newContacts) {
            if (!currentContacts.has(contact)) {
                const contactInfo = await getUserInfo(contact)
                if (!contactInfo || contactInfo.length === 0) {
                    continue
                }

                const clone = contactTemplate.content.cloneNode(true)
                const contactElement = clone.firstElementChild

                if (contact === recipientId) {
                    contactElement.classList.remove("btn-dark")
                    contactElement.classList.add("btn-primary")
                }

                const contactImg = clone.querySelector("#contactImg")
                const contactName = clone.querySelector("#contactName")

                contactImg.src = `/api/uploads/profile_pictures/${contact}`
                contactName.innerText = contactInfo.username

                contactElement.setAttribute("contact-id", contact)
                contactElement.addEventListener("click", handleContactClick)

                contactBar.appendChild(clone)
            }
        }

        // Remove contacts that are no longer in the list (if any)
        for (const existing of contactBar.children) {
            const id = Number(existing.getAttribute("contact-id"))
            if (!newContacts.has(id)) {
                existing.remove()
            }
        }
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
        // Track existing message IDs in the DOM
        const existingIds = new Set(
            Array.from(chatContainer.querySelectorAll("[data-message-id]"))
                .map(el => Number(el.getAttribute("data-message-id")))
        )

        const newIds = new Set(orderedMessages.map(m => m.id))

        // Add new messages
        orderedMessages.forEach(message => {
            if (!existingIds.has(message.id)) {
                let template = message.sender_id === sessionData.id ? senderTemplate : recipientTemplate
                let clone = template.content.cloneNode(true)
                let bubble = clone.querySelector("#messageBubble")
                let img = clone.querySelector("#messageImg")

                bubble.innerText = message.content
                img.src = `/api/uploads/profile_pictures/${message.sender_id}`

                clone.firstElementChild.setAttribute("data-message-id", message.id)
                chatContainer.appendChild(clone)
            }
        })

        // Remove deleted messages
        for (const existing of chatContainer.querySelectorAll("[data-message-id]")) {
            const id = Number(existing.getAttribute("data-message-id"))
            if (!newIds.has(id)) {
                existing.remove()
            }
        }
    })
}

// Initialize application
document.addEventListener("DOMContentLoaded", function () {
    updateSession().finally(function () {
        setInterval(() => {
            if (!isSessionLoading) {
                updateContacts()
                updateMessages()
            }
        }, 1000)
        setInterval(() => {
            if (!isSessionLoading) {
                updateSession()
            }
        }, 1000)
        toggleChatInput()
        updateContacts()
        updateMessages()
    })
})
