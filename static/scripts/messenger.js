let sessionData = null
let recipientId = null
let lastMessageId = 0
let webSocket = null

function setupWebSocket() {
    if (webSocket) return
    
    webSocket = new WebSocket(`ws://${window.location.host}/api/messenger/ws`)
    
    webSocket.onmessage = async (event) => {
        const data = JSON.parse(event.data)
        if (data.type === 'message' && 
            ((data.sender === sessionData.id && data.recipient === recipientId) || 
             (data.sender === recipientId && data.recipient === sessionData.id))) {
            await updateMessages()
        } else if (data.type === 'contact_update' && data.userId === sessionData.id) {
            await updateContacts()
        }
    }

    webSocket.onclose = () => {
        webSocket = null
        setTimeout(setupWebSocket, 5000) // Reconnect after 5 seconds
    }
}

function handleMessaging() {
    const textAreas = document.querySelectorAll("#messageTextArea")
    textAreas.forEach(async (chat) => {
        if (chat.disabled || chat.value.trim() === '') return
        
        try {
            await fetch("/api/messenger/send", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    sender: sessionData.id,
                    recipient: recipientId,
                    content: chat.value
                })
            })
            chat.value = ""
            await updateMessages()
        } catch (error) {
            console.error("Error sending message:", error)
        }
    })
}

function handleContactClick(event) {
    const contactId = event.currentTarget.getAttribute("contact-id")
    window.location.replace(`${contactId}`)
}

function handleChatInput(event) {
    const chat = event.currentTarget
    chat.style.height = 'auto'
    chat.style.height = `${chat.scrollHeight}px`
}

function handleChatFunctions(event) {
    const textArea = event.currentTarget
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        handleMessaging()
    } else if (event.key === 'Enter' && event.shiftKey) {
        textArea.setRangeText('\n', textArea.selectionStart, textArea.selectionEnd, 'end')
        handleChatInput(event)
    }
}

function toggleChatInput() {
    const textAreas = document.querySelectorAll("#messageTextArea")
    const messageButtons = document.querySelectorAll("#sendMessageBtn")
    
    const isSelf = recipientId === sessionData.id
    
    textAreas.forEach(chat => {
        chat.disabled = isSelf
        if (!isSelf) {
            chat.addEventListener('input', handleChatInput)
            chat.addEventListener('keydown', handleChatFunctions)
        }
    })

    messageButtons.forEach(button => {
        button.disabled = isSelf
        if (!isSelf) {
            button.addEventListener('click', handleMessaging)
        }
    })
}

async function getUserInfo(id) {
    try {
        const response = await fetch(`/api/user/${id}`)
        return await response.json()
    } catch (error) {
        console.error("Error fetching user info:", error)
        return null
    }
}

async function updateSession() {
    try {
        const response = await fetch("/api/current_user")
        sessionData = await response.json()
        const path = window.location.pathname
        recipientId = Number(path.split("/").pop())
        toggleChatInput()
        setupWebSocket()
    } catch (error) {
        console.error("Error fetching session:", error)
    }
}

async function updateContacts() {
    const contactTemplate = document.querySelector("#contactTemplate")
    const contactsBars = document.querySelectorAll("#contactsBar")
    const userInfo = await getUserInfo(sessionData.id)
    if (!userInfo) return

    const fragment = document.createDocumentFragment()
    const existingContactIds = new Set()

    for (const contact of userInfo.contacts) {
        const contactInfo = await getUserInfo(contact)
        if (!contactInfo) continue

        existingContactIds.add(contact)
        const clone = contactTemplate.content.cloneNode(true)
        const contactElement = clone.firstElementChild

        if (contact === recipientId) {
            contactElement.classList.replace("btn-dark", "btn-primary")
        }

        clone.querySelector("#contactImg").src = `/api/uploads/profile_pictures/${contact}`
        clone.querySelector("#contactName").innerText = contactInfo.username
        contactElement.setAttribute("contact-id", contact)
        contactElement.addEventListener("click", handleContactClick)

        fragment.appendChild(clone)
    }

    contactsBars.forEach(bar => {
        const currentContacts = new Set([...bar.querySelectorAll("[contact-id]")].map(el => el.getAttribute("contact-id")))
        if (currentContacts.size === existingContactIds.size && 
            [...currentContacts].every(id => existingContactIds.has(id))) {
            return
        }
        bar.replaceChildren(fragment)
    })
}

async function updateMessages() {
    const chatContainers = document.querySelectorAll("#chatContainer")
    const senderTemplate = document.querySelector("#senderTemplate")
    const recipientTemplate = document.querySelector("#recipientTemplate")

    try {
        const [currentUserMessages, recipientMessages] = await Promise.all([
            fetch(`/api/messenger/request/${sessionData.id}/${recipientId}?after=${lastMessageId}`).then(res => res.json()),
            fetch(`/api/messenger/request/${recipientId}/${sessionData.id}?after=${lastMessageId}`).then(res => res.json())
        ])

        const newMessages = [...currentUserMessages, ...recipientMessages]
            .sort((a, b) => a.id - b.id)
            .filter(msg => msg.id > lastMessageId)

        if (newMessages.length > 0) {
            lastMessageId = newMessages[newMessages.length - 1].id
            
            const fragment = document.createDocumentFragment()
            newMessages.forEach(message => {
                const template = message.sender_id === sessionData.id ? senderTemplate : recipientTemplate
                const clone = template.content.cloneNode(true)
                clone.querySelector("#messageBubble").innerText = message.content
                clone.querySelector("#messageImg").src = `/api/uploads/profile_pictures/${message.sender_id}`
                fragment.appendChild(clone)
            })

            chatContainers.forEach(container => {
                container.appendChild(fragment.cloneNode(true))
            })
        }
    } catch (error) {
        console.error("Error updating messages:", error)
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await updateSession()
    await Promise.all([updateContacts(), updateMessages()])
})