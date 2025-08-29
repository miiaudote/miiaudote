import { appliedFilters, fetchPosts } from "./post_module.js"

const filterMap = {
    checkPetRace: "filterGroupPetRace",
    checkPetAge: "filterGroupPetAge",
    checkPetSex: "filterGroupPetSex",
    checkPetSize: "filterGroupPetSize",
    checkPetLocation: "filterGroupPetLocation"
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

function initializeFilters() {
    for (let checkboxId in filterMap) {
        const checkbox = document.getElementById(checkboxId)
        if (checkbox) {
            checkbox.addEventListener("change", updateFilterVisibility)
        }
    }
    updateFilterVisibility()

    const applyButton = document.getElementById("applyFilter")
    if (applyButton) {
        applyButton.addEventListener("click", () => {
            appliedFilters.pet_race = document.getElementById("checkPetRace").checked
                ? document.getElementById("petRaceFilter").value
                : null

            appliedFilters.pet_age = document.getElementById("checkPetAge").checked
                ? document.getElementById("petAgeFilter").value
                : null

            appliedFilters.pet_sex = document.getElementById("checkPetSex").checked
                ? document.getElementById("petSexFilter").value
                : null

            appliedFilters.pet_size = document.getElementById("checkPetSize").checked
                ? document.getElementById("petSizeFilter").value
                : null

            appliedFilters.location = document.getElementById("checkPetLocation").checked
                ? document.getElementById("filterUF").value
                : null

            fetchPosts()
        })
    }
}

async function loadTowns(ufSelect) {
    let townSelect = document.getElementById(ufSelect.getAttribute("data-select-target"))
    townSelect.innerHTML = ""

    try {
        const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ufSelect.value}/municipios`)
        const data = await response.json()

        data.forEach(town => {
            let townOption = document.createElement("option")
            townOption.value = town.nome
            townOption.innerHTML = town.nome
            townSelect.appendChild(townOption)
        })
    } catch (error) {
        console.error("Error fetching towns:", error)
    }
}

document.addEventListener("DOMContentLoaded", function () {
    setInterval(fetchPosts, 3000)
    fetchPosts()

    Array.from(document.getElementsByClassName("UFSelect")).forEach(ufSelect => {
        ufSelect.addEventListener("change", () => loadTowns(ufSelect))
        loadTowns(ufSelect)
    })

    initializeFilters()
})