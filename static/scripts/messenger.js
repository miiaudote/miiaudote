// Global variables
let sessionData = null
let recipientId = null
let isSessionLoading = false
let isUpdating = false // Single lock for all updates

// Internal functions
async function handleMessaging() {
    if (isUpdating || isMessagingInProgress) return
    let isMessagingInProgress = true

    try {
        const textAreas = document.querySelectorAll("#messageTextArea")
        const promises = []

        textAreas.forEach(chat => {
            if (chat.disabled || chat.value.trim() === '') return

            const promise = fetch("/api/messenger/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sender: sessionData.id,
                    recipient: recipientId,
                    content: chat.value.trim()
                })
            })

            promises.push(promise)
            chat.value = ""
        })

        if (promises.length > 0) {
            await Promise.all(promises)
        }
        await updateMessages()
        await updateContacts()
    } catch (err) {
        console.error("Messaging failed:", err)
    } finally {
        isMessagingInProgress = false
    }
}

function handleContactClick(event) {
    const contactId = event.currentTarget.getAttribute("contact-id")
    window.location.replace(`/${contactId}`)
}

function handleChatInput(event) {
    const chat = event.currentTarget
    chat.style.height = 'auto'
    chat.style.height = chat.scrollHeight + 'px'
}

function handleChatFunctions(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        handleMessaging()
    }
}

// Enable/disable chat input based on recipient
function toggleChatInput() {
    const isSelfChat = recipientId === sessionData?.id
    const textAreas = document.querySelectorAll("#messageTextArea")
    const buttons = document.querySelectorAll("#sendMessageBtn")

    textAreas.forEach(chat => {
        chat.disabled = isSelfChat
        if (!isSelfChat) {
            chat.addEventListener('input', handleChatInput)
            chat.addEventListener('keydown', handleChatFunctions)
        }
    })

    buttons.forEach(btn => {
        btn.disabled = isSelfChat
        if (!isSelfChat) {
            btn.addEventListener('click', handleMessaging)
        }
    })
}

async function getUserInfo(id) {
    try {
        const res = await fetch(`/api/user/${id}`)
        if (!res.ok) return null
        return await res.json()
    } catch (err) {
        console.error("Failed to fetch user:", id, err)
        return null
    }
}

async function updateSession() {
    if (isSessionLoading || isUpdating) return
    isSessionLoading = true

    try {
        const res = await fetch("/api/current_user")
        if (!res.ok) throw new Error("Not authenticated")
        const user = await res.json()
        sessionData = user

        const path = window.location.pathname
        const pageId = path.split("/").filter(Boolean).pop()
        recipientId = Number(pageId) || null

        if (!recipientId || isNaN(recipientId)) {
            window.location.replace("/dashboard")
            return
        }

        const recipient = await getUserInfo(recipientId)
        if (!recipient) {
            window.location.replace("/dashboard")
        }
    } catch (err) {
        console.error("Session update failed:", err)
        window.location.replace("/login")
    } finally {
        isSessionLoading = false
    }
}

// REBUILT: No more duplicates — full rebuild every time
async function updateContacts() {
    if (!sessionData?.id || !recipientId) return

    const template = document.querySelector("#contactTemplate")
    const bars = document.querySelectorAll("#contactsBar")
    if (!template || bars.length === 0) return

    try {
        const userInfo = await getUserInfo(sessionData.id)
        if (!userInfo) return

        const res = await fetch("/api/messenger/get_contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: userInfo.id })
        })

        if (!res.ok) return
        const rawContacts = await res.json()
        const contactIds = Array.from(new Set([...rawContacts, recipientId]))
            .filter(id => id !== sessionData.id) // exclude self

        // Fetch all user info in parallel
        const contacts = await Promise.all(
            contactIds.map(async (id) => {
                const info = await getUserInfo(id)
                return info ? { id, info } : null
            })
        )

        // Rebuild every contacts bar
        bars.forEach(bar => {
            bar.innerHTML = '' // Clear all

            contacts.forEach(contact => {
                if (!contact) return

                const clone = template.content.cloneNode(true)
                const el = clone.firstElementChild

                // Highlight current chat
                if (contact.id === recipientId) {
                    el.classList.remove("btn-dark")
                    el.classList.add("btn-primary")
                } else {
                    el.classList.add("btn-dark")
                    el.classList.remove("btn-primary")
                }

                const img = clone.querySelector("#contactImg")
                const name = clone.querySelector("#contactName")

                img.src = `/api/uploads/profile_pictures/${contact.id}`
                img.alt = contact.info.username
                name.textContent = contact.info.username

                el.setAttribute("contact-id", contact.id)
                el.addEventListener("click", handleContactClick)

                bar.appendChild(clone)
            })
        })
    } catch (err) {
        console.error("updateContacts failed:", err)
    }
}

async function updateMessages() {
    if (!sessionData?.id || !recipientId) return

    const chatContainers = document.querySelectorAll("#chatContainer")
    const senderTemplate = document.querySelector("#senderTemplate")
    const recipientTemplate = document.querySelector("#recipientTemplate")

    if (!senderTemplate || !recipientTemplate || chatContainers.length === 0) return

    try {
        const [sent, received] = await Promise.all([
            fetch(`/api/messenger/request/${sessionData.id}/${recipientId}`).then(r => r.json()),
            fetch(`/api/messenger/request/${recipientId}/${sessionData.id}`).then(r => r.json())
        ])

        const allMessages = [...sent, ...received]
            .sort((a, b) => a.id - b.id)

        const newIds = new Set(allMessages.map(m => m.id))

        chatContainers.forEach(container => {
            const existing = container.querySelectorAll("[data-message-id]")
            const existingIds = new Set(Array.from(existing).map(el => Number(el.dataset.messageId)))

            // Add new messages
            allMessages.forEach(msg => {
                if (existingIds.has(msg.id)) return

                const template = msg.sender_id === sessionData.id ? senderTemplate : recipientTemplate
                const clone = template.content.cloneNode(true)
                const bubble = clone.querySelector("#messageBubble")
                const img = clone.querySelector("#messageImg")

                bubble.textContent = msg.content
                img.src = `/api/uploads/profile_pictures/${msg.sender_id}`
                img.alt = "Profile"

                clone.firstElementChild.dataset.messageId = msg.id
                container.appendChild(clone)
            })

            // Remove deleted
            existing.forEach(el => {
                if (!newIds.has(Number(el.dataset.messageId))) {
                    el.remove()
                }
            })

            // Scroll to bottom
            container.scrollTop = container.scrollHeight
        })
    } catch (err) {
        console.error("updateMessages failed:", err)
    }
}

// SINGLE POLLING LOOP — No overlaps, no duplicates
function startPolling() {
    setInterval(async () => {
        if (isUpdating || isSessionLoading) return
        isUpdating = true

        try {
            await updateSession()
            if (sessionData && recipientId) {
                await Promise.all([
                    updateContacts(),
                    updateMessages()
                ])
            }
        } catch (err) {
            console.error("Polling error:", err)
        } finally {
            isUpdating = false
        }
    }, 3000) // Every 3 seconds — smooth & efficient
}

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
    await updateSession()

    if (!sessionData || !recipientId) {
        window.location.replace("/dashboard")
        return
    }

    toggleChatInput()
    await Promise.all([updateContacts(), updateMessages()])
    startPolling()
})
