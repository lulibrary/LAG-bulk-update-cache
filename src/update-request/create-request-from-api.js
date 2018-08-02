
const AlmaClient = require('alma-api-wrapper')
const { RequestSchema } = require('@lulibrary/lag-alma-utils')
const CacheRequest = RequestSchema(process.env.LOAN_CACHE_TABLE)
const getApiKey = require('../get-alma-api-key')

const createRequestFromApi = (userID, requestID) => getApiKey()
  .then(() => new AlmaClient().users.for(userID).getLoan(requestID))
  .then(createRequestInCache)

const createRequestInCache = (request) => CacheRequest.create(request.data)

module.exports = createRequestFromApi
