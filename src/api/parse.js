import shajs from 'sha.js'
import sjcl from '@tinyanvil/sjcl'
import { status, StatusError } from 'itty-router-extras'

import { sendYnabFiles } from '../@js/ynab'
import sendGrid from '../@js/sendgrid'

// TODO:
// Ensure good error reporting
// Firewall endpoint
// Limit attachment filesize

export default async (request, env, ctx) => {
  const body = await request.formData()
  const file = body.get('attachment1')
  const { ACCOUNTS } = env

  let email = body.get('from')

  if (
    !email 
    || !file
  ) throw new StatusError(400)

  email = (email.match(/(?<=\<).*(?=\>)/gi)?.[0] || email).toLowerCase()

  const id = shajs('sha256').update(email).digest('hex')
  const pending_files = [Buffer.from(await file.arrayBuffer()).toString('utf8')]
  
  let cipher = await ACCOUNTS.get(id)

  const parsedCipher = cipher ? JSON.parse(Buffer.from(cipher, 'base64').toString('utf8')) : null

  if (!parsedCipher?.ct) {
    cipher = Buffer.from(JSON.stringify({
      email,
      pending_files
    })).toString('base64')

    await ACCOUNTS.put(id, cipher)

    await sendGrid(email, id, env)
  }

  else {
    const parsedCipher = JSON.parse(
      sjcl.decrypt(
        email + id,
        Buffer.from(cipher, 'base64').toString('utf8')
      )
    )

    await sendYnabFiles(
      parsedCipher,
      pending_files,
      id,
      email,
      env
    )
  }

  return status(204)
}