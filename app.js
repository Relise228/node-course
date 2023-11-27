const path = require("path")

const express = require("express")
const bodyParser = require("body-parser")
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

app.set("view engine", "ejs") // "pug" "handlebars"(need include engine())
app.set("views", "views")

const adminRoutes = require("./routes/admin")
const shopRoutes = require("./routes/shop")
const authRoutes = require("./routes/auth")

app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, "public"))) // access to static files inside public folder
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
  console.log()
  if (!req.session.user) {
    return next()
  }
  User.findById(req.session.user._id)
    .then((user) => {
      req.user = user
      next()
    })
    .catch((err) => console.log(err))
})

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn
  res.locals.csrfToken = req.csrfToken()
  next()
})

app.use("/admin", adminRoutes)
app.use(shopRoutes)
app.use(authRoutes)

app.use(errorController.get404)

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
