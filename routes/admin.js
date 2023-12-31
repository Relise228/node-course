const express = require("express")

const adminController = require("../controllers/admin")
const isAuth = require("../middleware/is-auth")
const { body } = require("express-validator")

const router = express.Router()

router.get("/add-product", isAuth, adminController.getAddProduct)

router.get("/products", isAuth, adminController.getProducts)

router.post(
  "/add-product",
  isAuth,
  [
    body("title").isString().isLength({ min: 3 }).trim(),
    body("price").isFloat(),
    body("description").isLength({ min: 5, max: 500 }).trim(),
  ],
  adminController.postAddProduct
)

router.get("/edit-product/:productId", isAuth, adminController.getEditProduct)

router.post(
  "/edit-product",
  isAuth,
  [
    body("title").isString().isLength({ min: 3 }).trim(),
    body("price").isFloat(),
    body("description").isLength({ min: 5, max: 500 }).trim(),
  ],
  adminController.postEditProduct
)

router.delete("/product/:productId", isAuth, adminController.deleteProduct)

module.exports = router
