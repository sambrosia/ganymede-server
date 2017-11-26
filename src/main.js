const express = require('express')
const bodyParser = require('body-parser')
const jwt = require('jsonwebtoken')
const rethink = require('rethinkdb')
const axios = require('axios')
const parseRSS = require('./parseRSS.js')
const CORS = require('./CORS.js')

const invalidTokens = new Set()

// Responds with an error if the provided token is blacklisted
// Does nothing if there is no token or the token is not blacklisted
function hasValidToken(req, res, next) {
  if (req.body.authToken && invalidTokens.has(req.body.authToken)) {
    res.status(403).json({
      name: 'JsonWebTokenError',
      message: 'jwt invalidated'
    })
  } else next()
}

// Blacklists the token
function invalidateToken(req, res, next) {
  if (req.body.authToken) invalidTokens.add(req.body.authToken)
  next()
}

// Sets the req.user for future middlewares to check auth status
// TODO: Persist user document in DB
function setUser(req, res, next) {
  if (req.body.authToken)
    req.user = jwt.verify(req.body.authToken, 'supersecret')
  next()
}

// Connect to RethinkDB
let connection = null
rethink
  .connect({ host: 'localhost', port: 28015 })
  .then(conn => {
    connection = conn
  })
  .catch(error => console.log(error))

// Create Express app
const app = express()
app.use(CORS)
app.use(bodyParser.json())

// Get temporary login token for given user
app.post('/login', (req, res) => {
  const token = jwt.sign({ email: req.body.email }, 'supersecret', {
    expiresIn: '5m'
  })

  // TODO: Send login link w/ this temp token to email
  res.json('Check your email for your login link')

  console.log(`\n${req.ip} requested login for ${req.body.email}`)
  console.log(`login url: ${req.get('origin')}/auth/${token}`)
})

// Get longer-term token from temp token
// TODO: Prevent use as login token?
app.post('/auth', hasValidToken, setUser, invalidateToken, (req, res) => {
  try {
    // Create new token for actual authentication
    const token = jwt.sign({ email: req.user.email }, 'supersecret', {
      expiresIn: '7d'
    })

    // Send new token to client
    res.json(token)

    console.log(`\n${req.ip} logged in as ${req.user.email}`)
  } catch (error) {
    res.status(500).json(error)
    console.log(error)
  }
})

// Parse podcast info from given rss url and respond w/ nice json
app.get('/podcast/:url', async (req, res) => {
  try {
    const url = decodeURIComponent(req.params.url)
    const feed = parseRSS((await axios(url)).data)
    res.json(feed)
  } catch (error) {
    console.log(error)
  }
})

app.listen(4000, () => console.log('\nAPI server listening on port 4000\n'))
