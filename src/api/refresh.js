import { json, StatusError } from 'itty-router-extras'

import { handleResponse } from '../@js/utils'
import { getYnabApi } from '../@js/ynab'

export default async (request, env, ctx) => {
  const body = await request.json()
  const { ACCOUNTS } = env

  if (!body.id)
    throw new StatusError(400)

  const id = body.id
  const cipher = await ACCOUNTS.get(id)

  const parsedCipher = JSON.parse(Buffer.from(cipher, 'base64').toString('utf8'))

  if (parsedCipher.ct)
    throw new StatusError(400)

  await getYnabApi(parsedCipher, null, null, env)

  const accounts = await fetch(`https://api.youneedabudget.com/v1/budgets/default/accounts`, {
    headers: {
      Authorization: `Bearer ${parsedCipher.ynab_access_token}`
    }
  })
  .then(handleResponse)
  .then(({data: {accounts}}) => accounts)

  return json(accounts)
}