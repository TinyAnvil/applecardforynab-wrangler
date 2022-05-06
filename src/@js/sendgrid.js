import { handleResponse } from "./utils"

export default function(email, id, env) {
  const { SENDGRID_API_KEY, NODE_ENV } = env
  const redirectUri = NODE_ENV === 'development' ? 'http://localhost:3333' : 'https://applecardforynab.com'

  return fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{to: [{email}]}],
      subject: 'Connect your YNAB account',
      content: [{
        type: 'text/html',
        value: `
          <h1>Welcome to Apple Card for YNAB!</h1>
          <p>In order to parse and deliver your Apple Card transactions to your YNAB account we'll need to connect to your YNAB account.</p>
    
          <strong>
          <a href="${redirectUri}?id=${id}">Connect your YNAB account</a>
          </strong>
    
          <br/>
          <br/>
          <aside>Need a little more info? Read our <a href="https://applecardforynab.com/assets/docs/privacy.md">privacy policy</a>.</aside>
        `
      }],
      from: {
        email: 'noreply@applecardforynab.com',
      }
    })
  })
  .then(handleResponse)
}