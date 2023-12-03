const Product = require("../models/product")
const { validationResult } = require("express-validator")
const fileHelper = require("../util/file")

exports.getAddProduct = (req, res, next) => {
  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: [],
  })
}

exports.postAddProduct = (req, res, next) => {
  const { title, price, description } = req.body
  const image = req.file
  if (!image) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      errorMessage: "Attached file is invalid",
      product: {
        title,
        price,
        description,
      },
      validationErrors: [],
    })
  }
  const imageUrl = image.path
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      errorMessage: errors.array()[0].msg,
      product: {
        title,
        price,
        description,
      },
      validationErrors: errors.array(),
    })
  }

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
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
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
        hasError: false,
        errorMessage: null,
        validationErrors: [],
      })
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.postEditProduct = (req, res, next) => {
  const { productId, title, price, description } = req.body
  const image = req.file
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Edit Product",
      path: "/admin/edit-product",
      editing: true,
      hasError: true,
      errorMessage: errors.array()[0].msg,
      product: {
        title,
        price,
        description,
        _id: productId,
      },
      validationErrors: errors.array(),
    })
  }

  Product.findById(productId)
    .then((product) => {
      if (product.userId.toString() !== req.user._id.toString()) {
        return res.redirect("/")
      }
      product.title = title
      if (image) {
        fileHelper.deleteFile(product.imageUrl)
        product.imageUrl = image.path
      }
      product.price = price
      product.description = description

      return product.save().then(() => {
        res.redirect("/admin/products")
      })
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
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
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.deleteProduct = (req, res, next) => {
  const { productId } = req.params
  Product.findById(productId)
    .then((prod) => {
      if (!prod) {
        return next(new Error("Product not found"))
      }
      fileHelper.deleteFile(prod.imageUrl)
      return Product.deleteOne({ _id: productId, userId: req.user._id })
    })
    .then(() => {
      res.status(200).json({ message: "Success" })
    })
    .catch((err) => {
      res.status(500).json({ message: "Failed" })
    })
}
