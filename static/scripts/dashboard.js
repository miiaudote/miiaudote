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
		if (first_image) {
			carousel_item.classList = ["carousel-item active"]
		}
		else {
			carousel_item.classList = ["carousel-item"]
		}

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

async function fetch_posts() {
	try {
		let feeds = document.getElementsByClassName("feed")

		const response = await fetch("/posts")
		const data = await response.json()

		feeds[0].innerHTML = ""
		feeds[1].innerHTML = ""

		data.forEach(post => {
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
	return
})