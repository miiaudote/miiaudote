import { fetch_posts } from "./post_module.js"

const filterMap = {
	checkPetRace: "filter_group_pet_race",
	checkPetAge: "filter_group_pet_age",
	checkPetSex: "filter_group_pet_sex",
	checkPetSize: "filter_group_pet_size",
	checkPetLocation: "filter_group_pet_location"
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
	return
})