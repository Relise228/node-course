const deleteProduct = (btn) => {
  const productId = btn.parentNode.querySelector("[name=productId]").value
  const csrf = btn.parentNode.querySelector("[name=_csrf]").value

  const prodElement = btn.closest("article")

  fetch(`/admin/product/${productId}`, {
    method: "DELETE",
    headers: {
      "csrf-token": csrf,
    },
  })
    .then((result) => result.json())
    .then((data) => {
      prodElement.parentNode.removeChild(prodElement)
    })
    .catch((err) => console.log(err))
}
