import { Router } from 'itty-router'
import {
  error,
  StatusError,
} from 'itty-router-extras'

import apiParse from './api/parse'
import apiAccess from './api/access'
import apiRefresh from './api/refresh'
import apiUpdate from './api/update'
// import apiAccounts from './api/accounts'

const router = Router()

router.post('/parse', apiParse)
router.post('/access', apiAccess)
router.post('/refresh', apiRefresh)
router.post('/update', apiUpdate)
// router.get('/accounts', apiAccounts)
router.all('*', () => { throw new StatusError(404, 'Not Found') })

export default { 
  fetch: (...args) => router
  .handle(...args)
  .then(res => {
    res.headers.append('Access-Control-Allow-Origin', '*') // cors ftw
    return res 
  })
  .catch((err) => {
    err = error(err.status, err?.message || err)
    err.headers.append('Access-Control-Allow-Origin', '*') // cors ftw
    return err
  })
}