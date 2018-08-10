
const AlmaClient = require('alma-api-wrapper')
const { UserSchema } = require('@lulibrary/lag-alma-utils')
const CacheUser = UserSchema(process.env.USER_CACHE_TABLE)
const getApiKey = require('../get-alma-api-key')

const createUserFromApi = (userID) => getApiKey()
  .then(() => getUserData(userID))
  .then(createUserInCache)

const getUserData = (userID) => {
  const almaApi = new AlmaClient()
  const apiUser = almaApi.users.for(userID)
  return Promise.all([
    apiUser.loans(),
    apiUser.requests(),
    apiUser.fees()
  ])
    .then(data => {
      return {
        id: userID,
        loans: data[0],
        requests: data[1],
        fees: data[2]
      }
    })
}

const createUserInCache = (userData) => {
  return CacheUser.create({
    primary_id: userData.id,
    loan_ids: Array.from(userData.loans.keys()),
    request_ids: Array.from(userData.requests.keys()),
    fee_ids: Array.from(userData.fees.keys())
  }, { overwrite: true })
}

module.exports = createUserFromApi
