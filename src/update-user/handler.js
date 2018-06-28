'use strict'
const almaApi = require('@lulibrary/node-alma-api')
const { User } = require('@lulibrary/lag-alma-utils')
const { Queue } = require('@lulibrary/lag-utils')

module.exports.handle = (event, context, callback) => {
  fetchUsersFromQueue()
    .then(userIDs => {
      return Promise.all(userIDs.map(updateUser))
        .then(user => {
          return Promise.all([
            sendLoanIDsToQueue(user.loan_ids)
          ])
        })
    })

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // callback(null, { message: 'Go Serverless v1.0! Your function executed successfully!', event });
}

const updateUser = (userID) => {
  return Promise.all([
    almaApi.users.for(userID).loans.get()
  ])
    .then(results => {
      return {
        primary_id: userID,
        loans: results[0]
      }
    })
    .then(userData => {
      User.create(userData)
    })
}

const sendLoanIDsToQueue = (loanIDs) => {
  const loansQueue = new Queue({})

  return Promise.all(loanIDs.map(loansQueue.sendMessage))
}

const fetchUsersFromQueue = () => {

}
