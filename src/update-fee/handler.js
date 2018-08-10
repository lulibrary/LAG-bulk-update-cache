'use strict'

const createFeeFromApi = require('./create-fee-from-api')

module.exports.handle = (event, context, callback) => {
  handleMessages(event.Records)
    .then(() => {
      callback(null, 'Successfully updated fees cache')
    })
    .catch(e => {
      console.log(e)
      callback(new Error('An error has occured'))
    })
}

const handleMessages = (messages = []) => {
  return Promise.all(
    messages.map((message) =>
      updateFee(JSON.parse(message.body))
    ))
}

const updateFee = (IDs) => {
  return createFeeFromApi(IDs.userID, IDs.feeID)
}
