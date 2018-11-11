const requestp = require('request-promise')

const addComment = (url, body, token) => requestp({
  url,
  json: true,
  headers: {
    'Authorization': 'token ' + token,
    'User-Agent': process.env.APP_NAME,
    'Accept': 'application/vnd.github.machine-man-preview+json'
  },
  method: 'POST',
  body: {
    body
  }
})

const payload = process.env.PAYLOAD
if (typeof payload === 'undefined') {
  console.error('No payload defined!')
} else {
  if (payload.action === 'synchronize') {
    console.log('Accepted Request: synchronize')
    if (typeof process.env.TOKEN === 'undefined') {
      console.error('No token defined! Abort.')
    } else {
      const timeToWait = process.env.WAIT_MS || 120000 // 2 minutes
      console.log(`waiting before doing a PR comment for ${timeToWait} ms.`)
      setTimeout(() => {
        console.log('now doing a PR comment')
        addComment(payload.pull_request.comments_url, process.env.COMMENT, process.env.TOKEN)
      }, timeToWait)
    }
  }
}

module.exports = { addComment }
