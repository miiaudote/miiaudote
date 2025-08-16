export let applied_filters = {
	petRace: null,
	petAge: null,
	petSex: null,
	petSize: null,
	location: null,
	userId: null
}

export function create_post(post, session, mobile) {
	// apenas o nosso Senhor Jesus sabe o motivo disso aqui funcionar (meia boca).

	let post_template = document.querySelector("#postTemplate")
	let clone = post_template.content.cloneNode(true)

	let posterName = clone.querySelector("#posterName")
	let posterLocation = clone.querySelector("#posterLocation")
	let postImages = clone.querySelector("#postImages")

	let petName = clone.querySelector("#postPetName")
	let petInfo = clone.querySelector("#postPetInfo")
	let petDescription = clone.querySelector("#postPetDescription")

	let postDescriptionCollapse = clone.querySelector("#postDescriptionCollapse")
	let readDescriptionBtn = clone.querySelector("#readDescriptionBtn")
	let postProfilePicture = clone.querySelector("#postProfilePicture")
	let audotarBtn = clone.querySelector("#audotarBtn")

	let postDeleteBtn = clone.querySelector("#postDeleteBtn")
	postDeleteBtn.setAttribute("post-id", post.id)

	postDescriptionCollapse.id = `collapse-${post.id}`
	readDescriptionBtn.setAttribute("data-bs-target", `#${postDescriptionCollapse.id}`)
	readDescriptionBtn.setAttribute("aria-controls", `#${postDescriptionCollapse.id}`)

	let filenames = JSON.parse(post.images)
	let first_image = true

	let postParentElement = postImages.parentElement
	let prev_button = postParentElement.querySelector(".carousel-control-prev")
	let next_button = postParentElement.querySelector(".carousel-control-next")
	let postTargetId = "carousel_post_" + post.id

	if (mobile) {
		postTargetId += "mobile"
	}

	postParentElement.id = postTargetId
	prev_button.setAttribute("data-bs-target", "#" + postTargetId)
	next_button.setAttribute("data-bs-target", "#" + postTargetId)

	filenames.forEach(filename => {
		let carousel_item = document.createElement("div")
		carousel_item.style = "height: 50vh;"
		carousel_item.classList = ["carousel-item" + (first_image ? " active" : "")]

		let carousel_item_img = document.createElement("img")
		carousel_item_img.classList = ["d-block h-100 w-100 object-fit-fill"]
		carousel_item_img.src = `/api/uploads/posts/${filename}`

		carousel_item.appendChild(carousel_item_img)
		postImages.appendChild(carousel_item)
		first_image = false
	})

	if (filenames.length == 1) {
		// hide carrousel controls
		prev_button.style.display = "none"
		next_button.style.display = "none"
	}
	if (post.userId == session.id && audotarBtn !== null) {
		audotarBtn.style.display = "none"
	}
	if (audotarBtn !== null) {
		audotarBtn.setAttribute("user-id", post.userId)
		audotarBtn.addEventListener("click", _on_audotar)
	}
	if (posterLocation !== null) {
		posterLocation.innerText = post.location
	}
	if (posterName !== null) {
		posterName.innerText = post.username
	}
	if (postProfilePicture !== null) {
		postProfilePicture.src = `/api/uploads/profile_pictures/${post.userId}`
		postProfilePicture.setAttribute("user-id", post.userId)
		postProfilePicture.addEventListener("click", _on_profile_picture_click)
	}
	if (session.id == post.userId) {
		postDeleteBtn.style.display = "block"
	}
	else {
		postDeleteBtn.style.display = "none"
	}
	postDeleteBtn.addEventListener("click", _on_post_deletion)

	petName.innerText = post.petName
	petInfo.innerText = `${post.petRace} ${post.petSex} ${post.petAge} ${post.petSize}`
	petDescription.innerText = post.petDescription
	return clone
}

export async function fetch_posts() {
	try {
		let feeds = document.getElementsByClassName("feed")
		let found_posts = []
		let post_info = []

		const response = await fetch("/api/posts")
		const data = await response.json()

		const session = await fetch("/api/session")
		const session_data = await session.json()

		data.forEach(post => {
			if (feeds[0].querySelectorAll(`[post-id="${post.id}"]`).length <= 0) {
				let clone_1 = create_post(post, session_data)
				let clone_2 = create_post(post, session_data, true)

				clone_1.firstElementChild.setAttribute("post-id", post.id)
				clone_2.firstElementChild.setAttribute("post-id", post.id)

				feeds[0].appendChild(clone_1)
				feeds[1].appendChild(clone_2)
			}
			post_info[post.id] = post
			found_posts.push(post.id)
			return
		})
		document.querySelectorAll('[post-id]').forEach(element => {
			let post_id = Number(element.getAttribute("post-id"))
			if (found_posts.indexOf(post_id) == -1) {
				element.remove()
				return
			}
			for (const [filter, value] of Object.entries(applied_filters)) {
				if (value !== null && post_info[post_id][filter] !== value) {
					element.remove()
				}
			}
			return
		})
	} catch (error) {
		console.error("Error fetching posts:", error)
	}
	return
}

// INTERNALS:
function _on_profile_picture_click(event) {
	let image_instance = event.currentTarget
	let userId = Number(image_instance.getAttribute("user-id"))

	window.location.replace(`profile/${userId}`)
	return
}

function _on_audotar(event) {
	let audotei_btn = event.currentTarget
	let userId = Number(audotei_btn.getAttribute("user-id"))

	window.location.replace(`messenger/${userId}`)
	return
}

async function _on_post_deletion(event) {
	let delete_btn = event.currentTarget
	let postId = Number(delete_btn.getAttribute("post-id"))

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
	return
}