const Product = require("../models/product")

exports.getAddProduct = (req, res, next) => {
  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
  })
}

exports.postAddProduct = (req, res, next) => {
  const { title, imageUrl, price, description } = req.body
  const product = new Product({
    title,
    price,
    description,
    imageUrl,
    userId: req.user._id,
  })
  product
    .save()
    .then((response) => {
      res.redirect("/admin/products")
    })
    .catch((err) => {
      console.log(err)
    })
}

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit === "true"
  if (!editMode) {
    res.redirect("/")
  }
  const { productId } = req.params
  Product.findById(productId)
    .then((product) => {
      if (!product) {
        res.redirect("/")
      }
      res.render("admin/edit-product", {
        pageTitle: "Edit Product",
        path: "/admin/edit-product",
        editing: editMode,
        product,
      })
    })
    .catch((err) => console.log(err))
}

exports.postEditProduct = (req, res, next) => {
  const { productId, title, imageUrl, price, description } = req.body
  Product.findById(productId)
    .then((product) => {
      if (product.userId.toString() !== req.user._id.toString()) {
        return res.redirect("/")
      }
      product.title = title
      product.imageUrl = imageUrl
      product.price = price
      return product.save().then(() => {
        res.redirect("/admin/products")
      })
    })

    .catch((err) => console.log(err))
}

exports.getProducts = (req, res, next) => {
  Product.find({
    userId: req.user._id,
  })
    // .populate("userId")
    .then((products) =>
      res.render("admin/products", {
        products,
        pageTitle: "Admin Products",
        path: "/admin/products",
      })
    )
    .catch((err) => console.log(err))
}

exports.postDeleteProduct = (req, res, next) => {
  const { productId } = req.body
  Product.deleteOne({ _id: productId, userId: req.user._id })
    .then(() => {
      res.redirect("/admin/products")
    })
    .catch((err) => console.log(err))
}
