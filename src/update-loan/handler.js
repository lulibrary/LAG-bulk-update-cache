'use strict'
const { Queue } = require('@lulibrary/lag-utils')

const createLoanFromApi = require('./create-loan-from-api')

const loansQueue = new Queue({
  url: process.env.LOANS_QUEUE_URL
})

module.exports.handle = (event, context, callback) => {
  loansQueue.receiveMessages()
    .then(handleMessages)
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
    messages.map((message) => updateLoan(message.Body))
      .concat(messages.map(deleteMessage)))
}

const updateLoan = (userID, loanID) => {
  return createLoanFromApi(userID, loanID)
}

const deleteMessage = (message) => {
  return loansQueue.deleteMessage(message.ReceiptHandle)
}
