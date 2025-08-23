export let appliedFilters = {
    pet_race: null,
    pet_age: null,
    pet_sex: null,
    pet_size: null,
    location: null,
    user_id: null
}

export function createPost(post, session, mobile) {
    let postTemplate = document.querySelector("#postTemplate")
    let clone = postTemplate.content.cloneNode(true)

    let posterName = clone.querySelector("#posterName")
    let posterLocation = clone.querySelector("#posterLocation")
    let postImages = clone.querySelector("#postImages")

    let petName = clone.querySelector("#postPetName")
    let petInfo = clone.querySelector("#postPetInfo")
    let petDescription = clone.querySelector("#postPetDescription")

    let postDescriptionCollapse = clone.querySelector("#postDescriptionCollapse")
    let readDescriptionButton = clone.querySelector("#readDescriptionBtn")
    let postProfilePicture = clone.querySelector("#postProfilePicture")
    let adoptButton = clone.querySelector("#audotarBtn")

    let postDeleteButton = clone.querySelector("#postDeleteBtn")
    postDeleteButton.setAttribute("post-id", post.id)

    postDescriptionCollapse.id = `collapse-${post.id}`
    readDescriptionButton.setAttribute("data-bs-target", `#${postDescriptionCollapse.id}`)
    readDescriptionButton.setAttribute("aria-controls", `#${postDescriptionCollapse.id}`)

    let filenames = JSON.parse(post.images)
    let isFirstImage = true

    let postParentElement = postImages.parentElement
    let prevButton = postParentElement.querySelector(".carousel-control-prev")
    let nextButton = postParentElement.querySelector(".carousel-control-next")
    let postTargetId = "carousel_post_" + post.id

    if (mobile) {
        postTargetId += "mobile"
    }

    postParentElement.id = postTargetId
    prevButton.setAttribute("data-bs-target", "#" + postTargetId)
    nextButton.setAttribute("data-bs-target", "#" + postTargetId)

    filenames.forEach(filename => {
        let carouselItem = document.createElement("div")
        carouselItem.style = "height: 50vh"
        carouselItem.classList = ["carousel-item" + (isFirstImage ? " active" : "")]

        let carouselItemImg = document.createElement("img")
        carouselItemImg.classList = ["d-block h-100 w-100 object-fit-fill"]
        carouselItemImg.src = `/api/uploads/posts/${filename}`

        carouselItem.appendChild(carouselItemImg)
        postImages.appendChild(carouselItem)
        isFirstImage = false
    })

    if (filenames.length === 1) {
        prevButton.style.display = "none"
        nextButton.style.display = "none"
    }
    if (post.user_id === session.id && adoptButton !== null) {
        adoptButton.style.display = "none"
    }
    if (adoptButton !== null) {
        adoptButton.setAttribute("user-id", post.user_id)
        adoptButton.addEventListener("click", handleAdopt)
    }
    if (posterLocation !== null) {
        posterLocation.innerText = post.location
    }
    if (posterName !== null) {
        posterName.innerText = post.username
    }
    if (postProfilePicture !== null) {
        postProfilePicture.src = `/api/uploads/profile_pictures/${post.user_id}`
        postProfilePicture.setAttribute("user-id", post.user_id)
        postProfilePicture.addEventListener("click", handleProfilePictureClick)
    }
    if (session.id === post.user_id) {
        postDeleteButton.style.display = "block"
    } else {
        postDeleteButton.style.display = "none"
    }

    postDeleteButton.addEventListener("click", handlePostDeletion)

    petName.innerText = post.pet_name
    petInfo.innerText = `${post.pet_race} ${post.pet_sex} ${post.pet_age} ${post.pet_size}`
    petDescription.innerText = post.pet_description

    return clone
}

export async function fetchPosts() {
    try {
        let feeds = document.getElementsByClassName("feed")
        let foundPosts = []
        let postInfo = []

        const response = await fetch("/api/posts")
        const data = await response.json()

        const session = await fetch("/api/session")
        const sessionData = await session.json()

        data.forEach(post => {
            if (feeds[0].querySelectorAll(`[post-id="${post.id}"]`).length <= 0) {
                let clone1 = createPost(post, sessionData)
                let clone2 = createPost(post, sessionData, true)

                clone1.firstElementChild.setAttribute("post-id", post.id)
                clone2.firstElementChild.setAttribute("post-id", post.id)

                feeds[0].appendChild(clone1)
                feeds[1].appendChild(clone2)
            }
            postInfo[post.id] = post
            foundPosts.push(post.id)
        })

        document.querySelectorAll('[post-id]').forEach(element => {
            let postId = Number(element.getAttribute("post-id"))
            if (foundPosts.indexOf(postId) === -1) {
                element.remove()
                return
            }
            for (const [filter, value] of Object.entries(appliedFilters)) {
                if (value !== null && postInfo[postId][filter] !== value) {
                    element.remove()
                }
            }
        })
    } catch (error) {
        console.error("Error fetching posts:", error)
    }
}

function handleProfilePictureClick(event) {
    let imageInstance = event.currentTarget
    let userId = Number(imageInstance.getAttribute("user-id"))

    window.location.replace(`profile/${userId}`)
}

function handleAdopt(event) {
    let adoptButton = event.currentTarget
    let userId = Number(adoptButton.getAttribute("user-id"))

    window.location.replace(`messenger/${userId}`)
}

async function handlePostDeletion(event) {
    let deleteButton = event.currentTarget
    let postId = Number(deleteButton.getAttribute("post-id"))

    await fetch(`/api/posts/delete`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            id: postId
        })
    })

    window.location.reload()
}