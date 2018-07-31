'use strict'

const createUserFromApi = require('./create-user-from-api')
const sendToQueue = require('./send-to-queue')

module.exports.handle = (event, context, callback) => {
  handleMessages(event.Records)
    .then(() => {
      callback(null, 'Successfully updated users cache')
    })
    .catch(e => {
      console.log(e)
      callback(new Error('An error has occured'))
    })
}

const handleMessages = (messages = []) => {
  return Promise.all(
    messages.map(message =>
      updateUser(message.Body)
    ))
}

const updateUser = (userID) => {
  return createUserFromApi(userID)
    .then(handleLoansAndRequests)
}

const handleLoansAndRequests = (user) => {
  return Promise.all([
    sendToQueue(process.env.LOANS_QUEUE_URL, buildLoanMessages(user)),
    sendToQueue(process.env.REQUESTS_QUEUE_URL, buildRequestMessages(user))
  ])
}

const buildLoanMessages = (user) => buildMessages(user, 'loan_ids', 'loanID')

const buildRequestMessages = (user) => buildMessages(user, 'request_ids', 'requestID')

const buildMessages = (user, arrayKey, idKey) => {
  return user[arrayKey].map(id => JSON.stringify({
    [idKey]: id,
    userID: user.primary_id
  }))
}
