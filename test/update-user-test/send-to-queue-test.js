// Test libraries
const sinon = require('sinon')
const sandbox = sinon.createSandbox()

const chai = require('chai')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.should()

const uuid = require('uuid')

const { Queue } = require('@lulibrary/lag-utils')

// Module under test
const sendMessagesToQueue = require('../../src/update-user/send-to-queue')

describe('send messages to Queue module tests', () => {
  describe('sendMessagesToQueue method tests', () => {
    it('should call Queue#sendMessage for each message', () => {
      const testMessages = [uuid(), uuid(), uuid(), uuid()]
      const sendMessageStub = sandbox.stub(Queue.prototype, 'sendMessage')
      sendMessageStub.resolves()

      return sendMessagesToQueue(uuid(), testMessages)
        .then(() => {
          testMessages.forEach(message => {
            sendMessageStub.should.have.been.calledWith(message)
          })
        })
    })
  })
})
