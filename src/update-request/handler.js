'use strict'

const createRequestFromApi = require('./create-request-from-api')
const parseMessages = require('../parse-messages')

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

const handleMessages = (messages) => Promise.all(parseMessages(messages).map(updateRequest))

const updateRequest = (IDs) => {
  return createRequestFromApi(IDs.userID, IDs.requestID)
}
