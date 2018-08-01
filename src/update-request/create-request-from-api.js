
const AlmaClient = require('alma-api-wrapper')
const { RequestSchema } = require('@lulibrary/lag-alma-utils')
const CacheRequest = RequestSchema(process.env.LOAN_CACHE_TABLE)
const getApiKey = require('../get-alma-api-key')

const createRequestFromApi = (userID, requestID) => getApiKey()
  .then(() => getRequestData(userID, requestID))
  .then(createRequestInCache)

const getRequestData = (userID, requestID) => {
  const almaApi = new AlmaClient()
  return almaApi.users.for(userID).getRequest(requestID)
}

const createRequestInCache = (request) => CacheRequest.create(request.data)

module.exports = createRequestFromApi
