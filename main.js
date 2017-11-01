const express = require('express')
const jwt = require('jsonwebtoken')

const app = express()
const invalidTokens = new Set()

// Get temporary login token for given user
app.post('/loginlink', (req, res) => {
  const token = jwt.sign({ email: req.query.email }, 'supersecret', {
    expiresIn: '5m'
  })

  // TODO: Send login link w/ this temp token to email
  res.send('Check your email for your login link.')

  console.log(`\n${req.ip} requested login for ${req.query.email}`)
  console.log(`token: ${token}`)
})

// Get longer-term token from temp token
app.post('/login', (req, res) => {
  // Make sure the provided token is not blacklisted
  if (invalidTokens.has(req.query.jwt)) {
    res.status(403).send('jwt is invalid')
    return
  }

  // Blacklist the token to prevent further logins using it
  invalidTokens.add(req.query.jwt)

  try {
    // Verify the token and respond with a new longer-lived one
    // for actual auth within the app
    const payload = jwt.verify(req.query.jwt, 'supersecret')
    const token = jwt.sign({ email: payload.email }, 'supersecret', {
      expiresIn: '7d'
    })
    res.json(token)

    console.log(`\n${req.ip} logged in as ${payload.email}`)
    console.log(`token: ${token}`)
  } catch (error) {
    res.status(403).json(error)
  }
})

app.listen(4000, () => console.log('listening on port 4000'))
