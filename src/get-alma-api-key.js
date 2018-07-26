const AWS = require('aws-sdk/global')
require('aws-sdk/clients/ssm')

const getAlmaApiKey = () => {
  return new AWS.SSM({ apiVersion: '2014-11-06' })
    .getParameter({
      Name: process.env.ALMA_API_KEY_NAME,
      WithDecryption: true
    })
    .promise()
    .then(data => {
      process.env.ALMA_KEY = data.Parameter.Value
      return data.Parameter.Value
    })
}

module.exports = getAlmaApiKey
