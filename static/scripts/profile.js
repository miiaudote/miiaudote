import { appliedFilters } from "./post_module.js"

function initializeEditModal(session) {
    let formUsername = document.querySelector("#formUsername")
    let formEmail = document.querySelector("#formEmail")
    let formPhone = document.querySelector("#formPhone")

    formUsername.value = session.username
    formEmail.value = session.email
    formPhone.value = session.phone.replace(/\D/g, "")
}

function initializeEditButton(pageId) {
    fetch("/api/current_user")
        .then(response => response.json())
        .then(user => {
            if (pageId == user.id) {
                let editButtons = document.querySelectorAll("#editBtn")
                editButtons.forEach(element => {
                    element.classList.remove("d-none")
                })
                initializeEditModal(user)
            }
        })
        .catch(error => {
            console.error("Error fetching session:", error)
        })
}

function initializeMessengerButton(button) {
    button.href = `/messenger/${appliedFilters.user_id}`
}

document.addEventListener("DOMContentLoaded", function() {
    const path = window.location.pathname
    const match = path.split("/")

    const pageId = match[match.length - 1]
    appliedFilters.user_id = Number(pageId)

    document.querySelectorAll("#messengerBtn").forEach(initializeMessengerButton)
    initializeEditButton(pageId)
})