const filterMap = {
	checkPetRace: "filter_group_pet_race",
	checkPetAge: "filter_group_pet_age",
	checkPetSex: "filter_group_pet_sex",
	checkPetSize: "filter_group_pet_size",
	checkPetLocation: "filter_group_pet_location"
}

const applied_filters = {
	pet_race: null,
	pet_age: null,
	pet_sex: null,
	pet_size: null,
	pet_location: null
}

function create_post(post, mobile) {
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
		carousel_item_img.src = `uploads/${filename}`

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

function updateFilterVisibility() {
	for (let checkboxId in filterMap) {
		const checkbox = document.getElementById(checkboxId)
		const filterGroup = document.getElementById(filterMap[checkboxId])
		if (checkbox && filterGroup) {
			filterGroup.style.display = checkbox.checked ? "block" : "none"
		}
	}
}

function initialize_filters() {
	for (let checkboxId in filterMap) {
		const checkbox = document.getElementById(checkboxId)
		if (checkbox) {
			checkbox.addEventListener("change", updateFilterVisibility)
		}
	}
	updateFilterVisibility()

	const applyBtn = document.getElementById("apply_filter")
	if (applyBtn) {
		applyBtn.addEventListener("click", () => {
			applied_filters.pet_race = document.getElementById("checkPetRace").checked
				? document.getElementById("pet_race_filter").value
				: null

			applied_filters.pet_age = document.getElementById("checkPetAge").checked
				? document.getElementById("pet_age_filter").value
				: null

			applied_filters.pet_sex = document.getElementById("checkPetSex").checked
				? document.getElementById("pet_sex_filter").value
				: null

			applied_filters.pet_size = document.getElementById("checkPetSize").checked
				? document.getElementById("pet_size_filter").value
				: null

			applied_filters.pet_location = document.getElementById("checkPetLocation").checked
				? document.getElementById("filterUF").value
				: null

			fetch_posts()
		})
	}
}

async function fetch_posts() {
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

async function load_towns(uf_select) {
	let town_select = document.getElementById(uf_select.getAttribute("data-select-target"))
	town_select.innerHTML = ""

	try {
		const towns = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf_select.value}/municipios`)
		const data = await towns.json()

		data.forEach(town => {
			let townNode = document.createElement("option")
			townNode.value = town.nome
			townNode.innerHTML = town.nome
			town_select.appendChild(townNode)
		})
	} catch (error) {
		console.error("Error fetching towns:", error)
	}
	return
}

document.addEventListener("DOMContentLoaded", function () {
	setInterval(fetch_posts, 3000)
	fetch_posts()

	Array.from(document.getElementsByClassName("uf_select")).forEach(uf_select => {
		uf_select.addEventListener("change", () => load_towns(uf_select))
		load_towns(uf_select)
	})

	initialize_filters()
})
