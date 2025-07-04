function on_search(event) {
    let search_list = document.querySelector("#search_list")
    let search_bar = event.target
    let search_text = search_bar.value
    
    // query of max 25 characters
    if (search_text.length < 3 || search_text.length > 25) {
        // clear list
        search_list.classList.add("d-none")
        search_list.innerHTML = ""
        return
    }

    fetch(`/api/search/${search_text}`)
        .then(function (response) {
			return response.json()
		})
        .then(function(users) {
            // clear previous list
            search_list.innerHTML = ""

            // create new list
            users.forEach(user => {
                let list_element = document.createElement("li")
                let list_link = document.createElement("a")

                list_link.href = `/profile/${user.id}`
                list_link.innerText = `${user.username}`

                search_list.appendChild(list_element)
                list_element.appendChild(list_link)
                return
            })
            if (users.length == 0) {
                search_list.classList.add("d-none")
            }
            else {
                search_list.classList.remove("d-none")
            }
            return
        })
        .catch(function(exception) {
            console.log("Erro ao pesquisar", exception)
            return
        })
    return
}

document.addEventListener("DOMContentLoaded", function () {
    let search_bar = document.querySelector("#search_bar")
    search_bar.addEventListener("input", on_search)
    return
})