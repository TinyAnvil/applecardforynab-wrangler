import Promise from 'bluebird'
import Papa from 'papaparse'
import moment from 'moment'
import BigNumber from 'bignumber.js'
import { orderBy } from 'lodash-es'
import sjcl from '@tinyanvil/sjcl'

import { handleResponse } from './utils'

export async function getYnabApi(parsedCipher, id, email, env) {
  const { ACCOUNTS, YNAB_CLIENT_ID, YNAB_CLIENT_SECRET } = env

  await fetch(`https://api.youneedabudget.com/v1/user`, {
    headers: {
      Authorization: `Bearer ${parsedCipher.ynab_access_token}`
    }
  })
  .then(handleResponse)
  .catch(() => {
    return fetch('https://app.youneedabudget.com/oauth/token', {
      method: 'POST',
      body: JSON.stringify({
        client_id: YNAB_CLIENT_ID,
        client_secret: YNAB_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: parsedCipher.ynab_refresh_token
      })
    })
    .then(handleResponse)
    .then(async (data) => {
      console.log('Refreshed Token')

      let cipher

      parsedCipher.ynab_access_token = data.access_token
      parsedCipher.ynab_refresh_token = data.refresh_token

      if (id && email)
        cipher = Buffer.from(sjcl.encrypt(
          email + id,
          JSON.stringify(parsedCipher)
        )).toString('base64')

      else
        cipher = Buffer.from(JSON.stringify(parsedCipher)).toString('base64')

      await ACCOUNTS.put(id, cipher)
    })
  })
}

export async function sendYnabFiles(parsedCipher, files, id, email, env) {
  await getYnabApi(parsedCipher, id, email, env)

  return new Promise.mapSeries(files, (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        transformHeader(header) {
          switch (header) {
            case 'Transaction Date':
            return 'Date'
            case 'Description':
            return 'Memo'
            case 'Merchant':
            return 'Payee'
            case 'Amount (USD)':
            return 'Amount'
            default:
            return header
          }
        },
        async complete({data}) {
          const now = moment.utc().format('YYYY-MM-DD')
          const transactions = orderBy(data, ['Date', 'Clearing Date', 'Type', 'Amount', 'Payee', 'Memo', 'Category'], 'desc')
          .map((row, i) => {
            const amount = new BigNumber(row.Amount).times('-1000')

            return {
              import_id: `ACFYNAB:${amount.toFixed()}:${now}:${i}`,
              account_id: parsedCipher.ynab_account_id,
              date: moment(row.Date, 'MM/DD/YYYY').format('YYYY-MM-DD'),
              amount: amount.toFixed(),
              payee_name: row.Payee,
              memo: row.Memo,
              cleared: 'cleared'
            }
          })

          try {
            console.log(parsedCipher)
            console.log(transactions)

            await fetch(`https://api.youneedabudget.com/v1/budgets/default/transactions`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${parsedCipher.ynab_access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ transactions })
            }).then(handleResponse)

            resolve()
          } catch(err) {
            reject(err)
          }
        },
        error(err) {
          reject(err)
        }
      })
    })
  })
}