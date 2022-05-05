import { json, StatusError } from 'itty-router-extras'

import { handleResponse } from '../@js/utils'

export default async (request, env, ctx) => {
  const body = await request.json()
  const { ACCOUNTS, YNAB_CLIENT_ID, YNAB_CLIENT_SECRET, NODE_ENV } = env

  if (
    !body.code
    || !body.id
  ) throw new StatusError(400)

  const code = body.code
  const id = body.id

  let cipher = await ACCOUNTS.get(id)

  const parsedCipher = JSON.parse(Buffer.from(cipher, 'base64').toString('utf8'))

  if (parsedCipher.ct)
    throw new StatusError(400)

  let accounts

  if (
    parsedCipher.ynab_access_token
    && parsedCipher.ynab_refresh_token
  ) {
    accounts = await fetch(`https://api.youneedabudget.com/v1/budgets/default/accounts`, {
      headers: {
        Authorization: `Bearer ${parsedCipher.ynab_access_token}`
      }
    })
    .then(handleResponse)
    .then(({data: {accounts}}) => accounts)
  }

  else {
    accounts = await fetch(`https://app.youneedabudget.com/oauth/token?client_id=${YNAB_CLIENT_ID}&client_secret=${YNAB_CLIENT_SECRET}&redirect_uri=${NODE_ENV === 'development' ? 'http://localhost:3333' : 'https://applecardforynab.com'}&grant_type=authorization_code&code=${code}`, {
      method: 'POST'
    }).then(handleResponse)
    .then(async ({access_token, refresh_token}) => {
      const accounts = await fetch(`https://api.youneedabudget.com/v1/budgets/default/accounts`, {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      })
      .then(handleResponse)
      .then(({data: {accounts}}) => accounts)

      parsedCipher.ynab_access_token = access_token
      parsedCipher.ynab_refresh_token = refresh_token

      const cipher = Buffer.from(JSON.stringify(parsedCipher)).toString('base64')

      await ACCOUNTS.put(id, cipher)

      return accounts
    })
  }

  return json(accounts)
}