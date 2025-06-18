export let applied_filters = {
	pet_race: null,
	pet_age: null,
	pet_sex: null,
	pet_size: null,
	pet_location: null,
    owner: null
}

export function create_post(post, mobile) {
	let post_template = document.querySelector("#post_template")
	let clone = post_template.content.cloneNode(true)

	let posterName = clone.querySelector("#posterName")
	let posterLocation = clone.querySelector("#posterLocation")
	let postImages = clone.querySelector("#postImages")

	let petName = clone.querySelector("#petName")
	let petRace = clone.querySelector("#petRace")
	let petAge = clone.querySelector("#petAge")
	let petSex = clone.querySelector("#petSex")
	let petSize = clone.querySelector("#petSize")

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
		carousel_item_img.src = `/uploads/${filename}`

		carousel_item.appendChild(carousel_item_img)
		postImages.appendChild(carousel_item)
		first_image = false
	})

	posterLocation.innerText = post.location
	posterName.innerText = post.username

	petName.innerText = "Nome: " + post.petName
	petRace.innerText = "Raça: " + post.petRace
	petAge.innerText = "Idade: " + post.petAge
	petSex.innerText = "Sexo: " + post.petSex
	petSize.innerText = "Porte: " + post.petSize
	return clone
}

export async function fetch_posts() {
	try {
		let feeds = document.getElementsByClassName("feed")

		const response = await fetch("/posts")
		const data = await response.json()

		feeds[0].innerHTML = ""
		feeds[1].innerHTML = ""

		data.forEach(post => {
			if (applied_filters.pet_race && post.petRace !== applied_filters.pet_race) return
			if (applied_filters.pet_age && post.petAge !== applied_filters.pet_age) return
			if (applied_filters.pet_sex && post.petSex !== applied_filters.pet_sex) return
			if (applied_filters.pet_size && post.petSize !== applied_filters.pet_size) return
			if (applied_filters.pet_location && post.location !== applied_filters.pet_location) return
            if (applied_filters.owner && post.userId !== applied_filters.owner) return

			let clone_1 = create_post(post)
			let clone_2 = create_post(post, true)

			feeds[0].appendChild(clone_1)
			feeds[1].appendChild(clone_2)
		})
	} catch (error) {
		console.error("Error fetching posts:", error)
	}
	return
}