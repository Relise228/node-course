const crypto = require("crypto")
const bcrypt = require("bcryptjs")
const nodemailer = require("nodemailer")
const mg = require("nodemailer-mailgun-transport")
const { validationResult } = require("express-validator")

const User = require("../models/user")
let transporter

try {
  transporter = nodemailer.createTransport(
    mg({
      auth: {
        api_key: "5c6a872af1198635e84c8718e4f61a24-c30053db-11a1bbbf",
        domain: "sandbox54bd06cf77d8485083a5c6f98ff85a02.mailgun.org",
      },
    })
  )
} catch {}

exports.getLogin = (req, res, next) => {
  let message = req.flash("error")
  if (message.length) {
    message = message[0]
  } else {
    message = null
  }
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: message,
    oldInput: {
      email: "",
      password: "",
    },
    validationErrors: [],
  })
}

exports.getSignup = (req, res, next) => {
  let message = req.flash("error")
  if (message.length) {
    message = message[0]
  } else {
    message = null
  }
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: message,
    oldInput: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    validationErrors: [],
  })
}

exports.postLogin = (req, res, next) => {
  const { email, password } = req.body
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email,
        password,
      },
      validationErrors: errors.array(),
    })
  }

  User.findOne({ email }).then((user) => {
    if (!user) {
      return res.status(422).render("auth/login", {
        path: "/login",
        pageTitle: "Login",
        errorMessage: "Invalid email or password.",
        oldInput: {
          email,
          password,
        },
        validationErrors: [],
      })
    }
    bcrypt
      .compare(password, user.password)
      .then((match) => {
        if (match) {
          req.session.isLoggedIn = true
          req.session.user = user
          return req.session.save((err) => {
            return res.redirect("/")
          })
        }
        return res.status(422).render("auth/login", {
          path: "/login",
          pageTitle: "Login",
          errorMessage: "Invalid email or password.",
          oldInput: {
            email,
            password,
          },
          validationErrors: [],
        })
      })
      .catch((err) => {
        const error = new Error(err)
        error.httpStatusCode = 500
        return next(error)
      })
  })
}

exports.postSignup = (req, res, next) => {
  const { email, password, confirmPassword } = req.body
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: errors.array()[0].msg,
      oldInput: { email, password, confirmPassword },
      validationErrors: errors.array(),
    })
  }

  return bcrypt
    .hash(password, 12)
    .then((hashedPassword) => {
      const user = new User({
        email,
        password: hashedPassword,
        cart: { items: [] },
      })
      return user.save()
    })
    .then((result) => {
      if (transporter) {
        transporter.sendMail({
          to: email,
          from: "shop@node.com",
          subject: "Signup succeeded!",
          html: "<h1>You seccessfully signed up!</h1>",
        })
      }
      res.redirect("/login")
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.postLogout = (req, res, next) => {
  req.session.destroy(() => {
    res.redirect("/")
  })
}

exports.getReset = (req, res, next) => {
  let message = req.flash("error")
  if (message.length) {
    message = message[0]
  } else {
    message = null
  }
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    errorMessage: message,
  })
}

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      return res.redirect("/reset")
    }

    const token = buffer.toString("hex")

    User.findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash("error", "No account with that email found!")
          return res.redirect("/reset")
        }
        user.resetToken = token
        user.resetTokenExpiration = Date.now() + 3600000
        return user.save()
      })
      .then((result) => {
        res.redirect("/")
        if (transporter) {
          transporter.sendMail({
            to: req.body.email,
            from: "shop@node.com",
            subject: "Password reset",
            html: `
          <p>You requested password reset</p>
          <p>Click this <a href="http://localhost:4000/new-password/${token}">link</a> to set a nwe password</p>
          `,
          })
        }
      })
      .catch((err) => {
        const error = new Error(err)
        error.httpStatusCode = 500
        return next(error)
      })
  })
}

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token
  User.findOne({
    resetToken: token,
    resetTokenExpiration: {
      $gt: Date.now(),
    },
  })
    .then((user) => {
      let message = req.flash("error")
      if (message.length) {
        message = message[0]
      } else {
        message = null
      }
      res.render("auth/new-password", {
        path: "/new-password",
        pageTitle: "New Password",
        errorMessage: message,
        userId: user._id.toString(),
        resetToken: token,
      })
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.postNewPassword = (req, res, next) => {
  const { userId, password, resetToken } = req.body
  User.findOne({
    _id: userId,
    resetToken,
    resetTokenExpiration: { $gt: Date.now() },
  })
    .then((user) => {
      if (!user) {
        req.flash("error", "User id is not correct")
        return res.redirect("/login")
      }
      return bcrypt.hash(password, 12).then((hashedPassword) => {
        user.password = hashedPassword
        user.resetToken = undefined
        user.resetTokenExpiration = undefined

        return user.save().then((result) => {
          transporter.sendMail({
            to: user.email,
            from: "shop@node.com",
            subject: "Password updated",
            html: "<h1>Your password was updated!</h1>",
          })
          res.redirect("/login")
        })
      })
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}
