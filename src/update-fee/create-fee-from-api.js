
const AlmaClient = require('alma-api-wrapper')
const { FeeSchema } = require('@lulibrary/lag-alma-utils')
const CacheFee = FeeSchema(process.env.FEE_CACHE_TABLE)
const getApiKey = require('../get-alma-api-key')

const createFeeFromApi = (userID, feeID) => getApiKey()
  .then(() => getFeeData(userID, feeID))
  .then(createFeeInCache)

const getFeeData = (userID, feeID) => {
  const almaApi = new AlmaClient()
  return almaApi.users.for(userID).getFee(feeID)
}

const createFeeInCache = (fee) => CacheFee.create(fee.data)

module.exports = createFeeFromApi
