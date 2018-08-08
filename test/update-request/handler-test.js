const AWS_MOCK = require('aws-sdk-mock')

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

const rewire = require('rewire')
let wires = []

const testRequestTable = `request_table_${uuid()}`
process.env.REQUEST_CACHE_TABLE = testRequestTable

// Module Libraries
const { Queue } = require('@lulibrary/lag-utils')
const AlmaUser = require('alma-api-wrapper/src/user')

// Module under test
const updateRequestHandler = rewire('../../src/update-request/handler')
const handler = (event = {}, ctx = {}) => new Promise((resolve, reject) => {
  updateRequestHandler.handle(event, ctx, (err, res) => {
    return err ? reject(err) : resolve(res)
  })
})

describe('update request handler tests', () => {
  afterEach(() => {
    sandbox.restore()
    wires.forEach(wire => wire())
    wires = []
  })
  it('should export a handler function', () => {
    updateRequestHandler.handle.should.be.an.instanceOf(Function)
  })

  describe('handler method tests', () => {
    it('should call handleMessages with the event Records', () => {
      const testEvent = { Records: [{
        body: JSON.stringify({ test: 'test_id' }),
        ReceiptHandle: 'test_message_handle'
      }]}

      const handleMessageStub = sandbox.stub()
      handleMessageStub.resolves()

      wires.push(
        updateRequestHandler.__set__('handleMessages', handleMessageStub),
        updateRequestHandler.__set__('updateRequest', () => Promise.resolve())
      )

      return handler(testEvent)
        .then(() => {
          handleMessageStub.should.have.been.calledWith([{
            body: JSON.stringify({ test: 'test_id' }),
            ReceiptHandle: 'test_message_handle'
          }])
        })
    })

    it('should callback with an error if handleMessages is rejected', () => {
      sandbox.stub(Queue.prototype, 'receiveMessages').resolves()
      const handleMessageStub = sandbox.stub()
      handleMessageStub.rejects()
      wires.push(updateRequestHandler.__set__('handleMessages', handleMessageStub))
      sandbox.stub(console, 'log')

      return handler().should.eventually.be.rejectedWith('An error has occured')
    })
  })

  describe('handleMessages method tests', () => {
    const handleMessages = updateRequestHandler.__get__('handleMessages')

    it('should call updateRequest with each message body', () => {
      const testRequestIDs = [uuid(), uuid(), uuid()]
      const testBodies = testRequestIDs.map(id => JSON.stringify({ requestID: id }))
      const testMessages = [{
        body: testBodies[0],
        ReceiptHandle: uuid()
      }, {
        body: testBodies[1],
        ReceiptHandle: uuid()
      }, {
        body: testBodies[2],
        ReceiptHandle: uuid()
      }]

      const updateRequestStub = sandbox.stub()
      updateRequestStub.resolves()

      wires.push(
        updateRequestHandler.__set__('updateRequest', updateRequestStub)
      )

      return handleMessages(testMessages)
        .then(() => {
          testRequestIDs.forEach(id => {
            updateRequestStub.should.have.been.calledWith({ requestID: id })
          })
        })
    })

    it('should default to an empty message array, and not call updateRequest or deleteMessage', () => {
      const updateRequestStub = sandbox.stub()
      updateRequestStub.resolves()

      wires.push(
        updateRequestHandler.__set__('updateRequest', updateRequestStub)
      )

      return handleMessages()
        .then(() => {
          updateRequestStub.should.not.have.been.called
        })
    })
  })

  describe('updateRequest method tests', () => {
    const updateRequest = updateRequestHandler.__get__('updateRequest')

    it('should call createRequestFromApi with the Request ID', () => {
      const createRequestStub = sandbox.stub()
      createRequestStub.resolves()

      wires.push(
        updateRequestHandler.__set__('createRequestFromApi', createRequestStub)
      )

      const testUserID = uuid()
      const testRequestID = uuid()

      return updateRequest({ userID: testUserID, requestID: testRequestID })
        .then(() => {
          createRequestStub.should.have.been.calledWith(testUserID, testRequestID)
        })
    })
  })

  describe('end to end tests', () => {
    let putStub, apiStub, sendMessageStub, getParameterStub

    before(() => {
      const e2eSandbox = sinon.createSandbox()
      putStub = e2eSandbox.stub()
      apiStub = e2eSandbox.stub(AlmaUser.prototype, 'getRequest')
      sendMessageStub = e2eSandbox.stub()
      getParameterStub = e2eSandbox.stub()

      AWS_MOCK.mock('DynamoDB', 'putItem', putStub)
      AWS_MOCK.mock('DynamoDB', 'describeTable', {
        Table: {
          TableStatus: 'ACTIVE'
        }
      })
      AWS_MOCK.mock('SQS', 'sendMessage', sendMessageStub)
      AWS_MOCK.mock('SSM', 'getParameter', getParameterStub)
    })

    after(() => {
      AWS_MOCK.restore('DynamoDB')
      AWS_MOCK.restore('SQS')
      AWS_MOCK.restore('SSM')
    })

    afterEach(() => {
      apiStub.reset()
      putStub.reset()
      sendMessageStub.reset()
      getParameterStub.reset()
    })

    it('should query the API for each request', () => {
      getParameterStub.callsArgWith(1, null, { Parameter: { Value: uuid() } })
      sendMessageStub.resolves()
      putStub.callsArgWith(1, null, {})

      const testRequestIDs = [uuid(), uuid(), uuid()]
      const testUserID = uuid()

      testRequestIDs.forEach((ID, index) => {
        apiStub.onCall(index).resolves({ Item: {
          data: {
            request_id: ID
          }
        } })
      })

      const testEvent = {
        Records: testRequestIDs.map(ID => {
          return { body: JSON.stringify({
            userID: testUserID,
            requestID: ID
          }) }
        })
      }

      return handler(testEvent, null)
        .then(() => {
          testRequestIDs.forEach((ID, index) => {
            apiStub.onCall(index).should.have.been.calledWith(ID)
          })
        })
    })

    it('should query the Alma API for requests not in the cache')
  })
})
