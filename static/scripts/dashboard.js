function create_post(post) {
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
	filenames.forEach(filename => {
		let carousel_item = document.createElement("div")
		carousel_item.classList = ["carousel-item active"]

		let carousel_item_img = document.createElement("img")
		carousel_item_img.classList = ["d-block w-100"]
		carousel_item_img.src = `uploads/${filename}`

		carousel_item.appendChild(carousel_item_img)
		postImages.appendChild(carousel_item)
	})

	posterLocation.innerText = ""
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
			let clone_2 = create_post(post)

			feeds[0].appendChild(clone_1)
			feeds[1].appendChild(clone_2)
		})
	} catch (error) {
		console.error("Error fetching posts:", error)
	}
	return
}

async function load_towns() {
	const uf_select = document.querySelector("#uf_select")
	let town_select = document.querySelector("#townSelector")
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
	setInterval(fetch_posts, 30400)
	fetch_posts()
	load_towns()

	const uf_select = document.querySelector("#uf_select")
	uf_select.addEventListener("change", load_towns)
	return
})