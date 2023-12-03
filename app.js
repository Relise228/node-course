const path = require("path")

const express = require("express")
const bodyParser = require("body-parser")
const multer = require("multer")
const mongoose = require("mongoose")
const session = require("express-session")
const MongoDBStore = require("connect-mongodb-session")(session)
const csrf = require("csurf")
const flash = require("connect-flash")

const PORT = process.env.SERVER_PORT || 4000

const errorController = require("./controllers/error")
const User = require("./models/user")

const app = express()
const store = new MongoDBStore({
  uri: "mongodb+srv://relise:MtfRbULbc6zLrUmN@nodecluster.ysnninw.mongodb.net/node-course?retryWrites=true&w=majority",
  collection: "sessions",
})
const csrfProtection = csrf()

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images")
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + "-" + file.originalname)
  },
})

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true)
  } else {
    cb(null, false)
  }
}

app.set("view engine", "ejs") // "pug" "handlebars"(need include engine())
app.set("views", "views")

const adminRoutes = require("./routes/admin")
const shopRoutes = require("./routes/shop")
const authRoutes = require("./routes/auth")

app.use(bodyParser.urlencoded({ extended: false }))
app.use(multer({ storage: fileStorage, fileFilter }).single("image"))
app.use(express.static(path.join(__dirname, "public"))) // access to static files inside public folder
app.use("/images", express.static(path.join(__dirname, "images")))
app.use(
  session({
    secret: "mysecret",
    resave: false,
    saveUninitialized: false,
    store,
  })
)
app.use(csrfProtection)
app.use(flash())

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn
  res.locals.csrfToken = req.csrfToken()
  next()
})

app.use((req, res, next) => {
  if (!req.session.user) {
    return next()
  }
  User.findById(req.session.user._id)
    .then((user) => {
      if (!user) {
        return next()
      }
      req.user = user
      next()
    })
    .catch((err) => {
      next(new Error(err))
    })
})

app.use("/admin", adminRoutes)
app.use(shopRoutes)
app.use(authRoutes)

app.use("/500", errorController.get500)
app.use(errorController.get404) // will catch all possible routes except error handler
/* Global handling Errors  */
app.use((error, req, res, next) => {
  res.status(500).render("500", {
    pageTitle: "Error",
    path: "/500",
    isAuthenticated: req.session.isLoggedIn,
  })
})

mongoose
  .connect(
    "mongodb+srv://relise:MtfRbULbc6zLrUmN@nodecluster.ysnninw.mongodb.net/?retryWrites=true&w=majority",
    {
      dbName: "node-course",
    }
  )
  .then((result) => {
    console.log("Connected")
    app.listen(PORT, () => {
      console.log(`SERVER STARTED ON PORT - ${PORT}`)
    })
  })
  .catch((err) => {
    console.log(err)
  })
