const Product = require("../models/product")
const Order = require("../models/order")
const fs = require("fs")
const path = require("path")
const PDFDocument = require("pdfkit")
const stripe = require("stripe")(process.env.STRIPE_KEY)

const ITEMS_PER_PAGE = 2

exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1
  let totalItems

  Product.find()
    .countDocuments()
    .then((numProducts) => {
      totalItems = numProducts
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)
    })
    .then((products) => {
      res.render("shop/product-list", {
        products,
        pageTitle: "All Products",
        path: "/products",
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      })
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
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
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1
  let totalItems

  Product.find()
    .countDocuments()
    .then((numProducts) => {
      totalItems = numProducts
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)
    })
    .then((products) => {
      res.render("shop/index", {
        products,
        pageTitle: "Shop",
        path: "/",
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      })
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your Cart",
        products: user.cart.items.map((item) => ({
          ...item.productId._doc,
          quantity: item.quantity,
        })),
      })
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
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
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.postCartDeleteProduct = (req, res, next) => {
  const { productId } = req.body
  req.user
    .removeFromCart(productId)
    .then((result) => {
      res.redirect("/cart")
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.getCheckout = (req, res, next) => {
  let products
  let total = 0
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      products = user.cart.items
      products.forEach((p) => {
        total += p.quantity * p.productId.price
      })

      return stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: products.map((p) => {
          return {
            price_data: {
              currency: "usd",
              unit_amount: p.productId.price * 100,
              product_data: {
                name: p.productId.title,
                description: p.productId.description,
              },
            },
            quantity: p.quantity,
          }
        }),
        mode: "payment",
        success_url:
          req.protocol + "://" + req.get("host") + "/checkout/success",
        cancel_url: req.protocol + "://" + req.get("host") + "/checkout/cancel",
      })
    })
    .then((session) => {
      res.render("shop/checkout", {
        path: "/checkout",
        pageTitle: "Checkout",
        products: products.map((item) => ({
          ...item.productId._doc,
          quantity: item.quantity,
        })),
        totalSum: total,
        sessionId: session.id,
      })
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.getCheckoutSuccess = (req, res, next) => {
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
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
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
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
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
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.getInvoice = (req, res, next) => {
  const { orderId } = req.params
  Order.findById(orderId)
    .then((order) => {
      if (!order) {
        return next(new Error("No order found"))
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error("Unauthorized"))
      }

      const invoiceName = "invoice-" + orderId + ".pdf"
      const invoicePath = path.join("data", "invoices", invoiceName)

      const pdfDoc = new PDFDocument()
      res.setHeader("Content-Type", "application/pdf")
      res.setHeader(
        "Content-Disposition",
        'inline; filename="' + invoiceName + '"'
      )
      pdfDoc.pipe(fs.createWriteStream(invoicePath))
      pdfDoc.pipe(res)

      pdfDoc.fontSize(26).text("Invoice", {
        underline: true,
      })

      pdfDoc.text("----------------------")
      let totalPrice = 0
      order.products.forEach((prod) => {
        totalPrice += prod.quantity * prod.product.price
        pdfDoc
          .fontSize(14)
          .text(
            prod.product.title +
              " - " +
              prod.quantity +
              " x " +
              "$" +
              prod.product.price
          )
      })
      pdfDoc.text("----------------------")
      pdfDoc.fontSize(20).text("Total Price: $" + totalPrice)
      pdfDoc.end()
    })
    .catch((err) => next(err))

  // fs.readFile(invoicePath, (err, data) => {
  //   if (err) {
  //     return next(err)
  //   }
  //   res.setHeader("Content-Type", "application/pdf")
  //   res.setHeader(
  //     "Content-Disposition",
  //     'inline; filename="' + invoiceName + '"'
  //   )
  //   res.send(data)
  // })
}
