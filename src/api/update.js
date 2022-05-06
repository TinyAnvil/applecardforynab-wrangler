import sjcl from '@tinyanvil/sjcl'
import { status, StatusError } from 'itty-router-extras'

import { sendYnabFiles } from '../@js/ynab'

export default async (request, env, ctx) => {
  const body = await request.json()
  const { ACCOUNTS } = env

  if (
    !body.id
    || !body.account_id
  ) throw new StatusError(400)

  const id = body.id
  const account_id = body.account_id
  
  let cipher = await ACCOUNTS.get(id)

  const parsedCipher = JSON.parse(Buffer.from(cipher, 'base64').toString('utf8'))

  if (parsedCipher.ct)
    throw new StatusError(400)

  const email = parsedCipher.email

  parsedCipher.ynab_account_id = account_id

  if (parsedCipher.pending_files) {
    await sendYnabFiles(
      parsedCipher,
      parsedCipher.pending_files,
      null,
      null,
      env
    )
    delete parsedCipher.pending_files
    delete parsedCipher.email
  }

  cipher = Buffer.from(sjcl.encrypt(
    email + id,
    JSON.stringify(parsedCipher)
  )).toString('base64')

  await ACCOUNTS.put(id, cipher)

  return status(204)
}