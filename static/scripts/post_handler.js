import { applied_filters, fetch_posts } from "./post_module.js"

const filter_map = {
	checkPetRace: "filterGroupPetRace",
	checkPetAge: "filterGroupPetAge",
	checkPetSex: "filterGroupPetSex",
	checkPetSize: "filterGroupPetSize",
	checkPetLocation: "filterGroupPetLocation"
}

function update_filter_visibility() {
	for (let checkbox_id in filter_map) {
		const checkbox = document.getElementById(checkbox_id)
		const filter_group = document.getElementById(filter_map[checkbox_id])
		if (checkbox && filter_group) {
			filter_group.style.display = checkbox.checked ? "block" : "none"
		}
	}
}

function initialize_filters() {
	for (let checkbox_id in filter_map) {
		const checkbox = document.getElementById(checkbox_id)
		if (checkbox) {
			checkbox.addEventListener("change", update_filter_visibility)
		}
	}
	update_filter_visibility()

	const apply_btn = document.getElementById("applyFilter")
	if (apply_btn) {
		apply_btn.addEventListener("click", () => {
			applied_filters.petRace = document.getElementById("checkPetRace").checked
				? document.getElementById("petRaceFilter").value
				: null

			applied_filters.petAge = document.getElementById("checkPetAge").checked
				? document.getElementById("petAgeFilter").value
				: null

			applied_filters.petSex = document.getElementById("checkPetSex").checked
				? document.getElementById("petSexFilter").value
				: null

			applied_filters.petSize = document.getElementById("checkPetSize").checked
				? document.getElementById("petSizeFilter").value
				: null

			applied_filters.location = document.getElementById("checkPetLocation").checked
				? document.getElementById("filterUF").value
				: null

			fetch_posts()
		})
	}
}

async function load_towns(uf_select) {
	let town_select = document.getElementById(uf_select.getAttribute("data-select-target"))
	town_select.innerHTML = ""

	try {
		const towns = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf_select.value}/municipios`)
		const data = await towns.json()

		data.forEach(town => {
			let town_node = document.createElement("option")
			town_node.value = town.nome
			town_node.innerHTML = town.nome
			town_select.appendChild(town_node)
		})
	} catch (error) {
		console.error("Error fetching towns:", error)
	}
	return
}

document.addEventListener("DOMContentLoaded", function () {
	setInterval(fetch_posts, 3000)
	fetch_posts()

	Array.from(document.getElementsByClassName("UFSelect")).forEach(uf_select => {
		uf_select.addEventListener("change", () => load_towns(uf_select))
		load_towns(uf_select)
		return
	})

	initialize_filters()
	return
})