const AWS_MOCK = require('aws-sdk-mock')
const sinon = require('sinon')
const sandbox = sinon.createSandbox()

const stubs = (() => {
  this.putStub = sandbox.stub()

  AWS_MOCK.mock('DynamoDB', 'describeTable', {
    Table: {
      TableStatus: 'ACTIVE'
    }
  })
  AWS_MOCK.mock('DynamoDB', 'putItem', this.putStub)

  return this
})()

module.exports = stubs
