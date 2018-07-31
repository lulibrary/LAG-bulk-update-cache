'use strict'

const createLoanFromApi = require('./create-loan-from-api')

module.exports.handle = (event, context, callback) => {
  handleMessages(event.Records)
    .then(() => {
      callback(null, 'Successfully updated loans cache')
    })
    .catch(e => {
      console.log(e)
      callback(new Error('An error has occured'))
    })
}

const handleMessages = (messages = []) => {
  return Promise.all(
    messages.map((message) =>
      updateLoan(JSON.parse(message.body))
    ))
}

const updateLoan = (IDs) => {
  return createLoanFromApi(IDs.userID, IDs.loanID)
}
