module.exports = (req, res, next) => {
  if (!req.session.isLoggedIn) {
    console.log(123)
    return res.redirect("/login")
  }
  next()
}
