const express = require('express')
const jwt = require('jsonwebtoken')
const rethink = require('rethinkdb')
const axios = require('axios')
const parseRSS = require('./parseRSS.js')
const CORS = require('./CORS.js')

const app = express()
const invalidTokens = new Set()

let connection = null
rethink
  .connect({ host: 'localhost', port: 28015 })
  .then(conn => {
    connection = conn
  })
  .catch(error => console.log(error))

// Enable CORS middleware
app.use(CORS)

// Get temporary login token for given user
app.post('/login/:email', (req, res) => {
  const token = jwt.sign({ id: req.params.email }, 'supersecret', {
    expiresIn: '5m'
  })

  // TODO: Send login link w/ this temp token to email
  res.json('Check your email for your login link')

  console.log(`\n${req.ip} requested login for ${req.params.email}`)
  console.log(`login url: ${req.get('origin')}/auth/${token}`)
})

// Get longer-term token from temp token
app.post('/auth/:jwt', async (req, res) => {
  // Make sure the provided token is not blacklisted
  if (invalidTokens.has(req.params.jwt)) {
    res.status(403).json({
      name: 'JsonWebTokenError',
      message: 'jwt invalidated'
    })
    return
  }

  // Blacklist the token to prevent further logins using it
  invalidTokens.add(req.params.jwt)

  try {
    // Verify the login token's signature
    const payload = jwt.verify(req.params.jwt, 'supersecret')

    // Fetch or create the user document
    let user = await rethink
      .table('users')
      .get(payload.id)
      .run(connection)

    if (user === null) {
      user = { id: payload.id }
      rethink
        .table('users')
        .insert(user)
        .run(connection)
        .catch(error => console.log(error))
    }

    // Create new token for actual authentication
    const token = jwt.sign(user, 'supersecret', {
      expiresIn: '7d'
    })

    // Send new token to client
    res.json(token)

    console.log(`\n${req.ip} logged in as ${user.id}`)
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
