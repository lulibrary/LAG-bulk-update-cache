'use strict'

const createLoanFromApi = require('./create-loan-from-api')
const parseMessages = require('../parse-messages')

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

const handleMessages = (messages) => Promise.all(parseMessages(messages).map(updateLoan))

const updateLoan = (IDs) => {
  return createLoanFromApi(IDs.userID, IDs.loanID)
}
