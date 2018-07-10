
const AlmaClient = require('alma-api-wrapper')
const { UserSchema } = require('@lulibrary/lag-alma-utils')
const User = UserSchema(process.env.USER_CACHE_TABLE)

const createUserFromApi = (userID) => getUserData(userID).then(createUser)

const getUserData = (userID) => {
  const almaApi = new AlmaClient()
  const apiUser = almaApi.users.for(userID)
  return Promise.all([
    apiUser.loans(),
    apiUser.requests()
  ])
    .then(data => {
      return {
        id: userID,
        loans: data[0],
        requests: data[1]
      }
    })
}

const createUser = (userData) => {
  return User.create({
    primary_id: userData.id,
    loan_ids: Array.from(userData.loans.keys()),
    request_ids: Array.from(userData.requests.keys())
  })
}

module.exports = createUserFromApi
