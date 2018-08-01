'use strict'

const createRequestFromApi = require('./create-request-from-api')

module.exports.handle = (event, context, callback) => {
  handleMessages(event.Records)
    .then(() => {
      callback(null, 'Successfully updated requests cache')
    })
    .catch(e => {
      console.log(e)
      callback(new Error('An error has occured'))
    })
}

const handleMessages = (messages = []) => {
  return Promise.all(
    messages.map((message) =>
      updateRequest(JSON.parse(message.body))
    ))
}

const updateRequest = (IDs) => {
  return createRequestFromApi(IDs.userID, IDs.requestID)
}
