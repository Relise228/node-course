const Product = require("../models/product")
const Order = require("../models/order")

exports.getProducts = (req, res, next) => {
  Product.find()
    .then((products) => {
      res.render("shop/product-list", {
        products,
        pageTitle: "All Products",
        path: "/products",
      })
    })
    .catch((err) => {
      console.log(err)
    })
}

exports.getProduct = (req, res, next) => {
  const { productId } = req.params
  Product.findById(productId)
    .then((product) => {
      res.render("shop/product-detail", {
        product,
        pageTitle: product.title,
        path: "/products",
      })
    })
    .catch((err) => console.log(err))
}

exports.getIndex = (req, res, next) => {
  Product.find()
    .then((products) => {
      res.render("shop/index", {
        products,
        pageTitle: "Shop",
        path: "/",
      })
    })
    .catch((err) => {
      console.log(err)
    })
}

exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      console.log(
        user.cart.items.map((item) => ({
          ...item.productId._doc,
          quantity: item.quantity,
        }))
      )
      res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your Cart",
        products: user.cart.items.map((item) => ({
          ...item.productId._doc,
          quantity: item.quantity,
        })),
      })
    })
    .catch((err) => console.log(err))
}

exports.postCart = (req, res, next) => {
  const { productId } = req.body
  Product.findById(productId)
    .then((product) => {
      return req.user.addToCart(product)
    })
    .then((result) => {
      res.redirect("/cart")
    })
}

exports.postCartDeleteProduct = (req, res, next) => {
  const { productId } = req.body
  req.user
    .removeFromCart(productId)
    .then((result) => {
      res.redirect("/cart")
    })
    .catch((err) => console.log(err))
}

exports.postOrder = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      const products = user.cart.items.map((item) => ({
        quantity: item.quantity,
        product: { ...item.productId._doc },
      }))
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user,
        },
        products,
      })
      order.save()
    })
    .then((result) => {
      return req.user.clearCart()
    })
    .then(() => {
      res.redirect("/orders")
    })
    .catch((err) => console.log(err))
}

exports.getOrders = (req, res, next) => {
  Order.find({
    "user.userId": req.user._id,
  })
    .then((orders) => {
      res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your Orders",
        orders,
      })
    })
    .catch((err) => console.log(err))
}
