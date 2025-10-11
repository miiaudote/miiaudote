function handleSearch(event) {
	let searchList = document.querySelector("#searchList")
	let searchBar = event.target
	let searchText = searchBar.value

	// Query of max 25 characters
	if (searchText.length < 3 || searchText.length > 25) {
		// Clear list
		searchList.classList.add("d-none")
		searchList.innerHTML = ""
		return
	}

	fetch(`/api/search/${searchText}`)
		.then(response => response.json())
		.then(users => {
			// Clear previous list
			searchList.innerHTML = ""

			// Create new list
			users.forEach(user => {
				let listItem = document.createElement("li")
				let listLinkTemplate = document.querySelector("#listLinkTemplate")

				let listLink = listLinkTemplate.content.cloneNode(true)
				let listLinkImage = listLink.querySelector("#listLinkImage")
				let listLinkText = listLink.querySelector("#listLinkText")

				listLinkImage.src = `/api/uploads/profile_pictures/${user.id}`
				
				listLinkText.href = `/profile/${user.id}`
				listLinkText.innerText = `${user.username}`

				searchList.appendChild(listItem)
				listItem.appendChild(listLink)
			})

			if (users.length === 0) {
				searchList.classList.add("d-none")
			} else {
				searchList.classList.remove("d-none")
			}
		})
		.catch(exception => {
			console.log("Error searching:", exception)
		})
}

document.addEventListener("DOMContentLoaded", function() {
	let searchBar = document.querySelector("#searchBar")
	searchBar.addEventListener("input", handleSearch)
})