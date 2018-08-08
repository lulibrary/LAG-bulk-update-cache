// Test libraries
const AWS_MOCK = require('aws-sdk-mock')
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

const testFeeTable = `fee_table_${uuid()}`
process.env.FEE_CACHE_TABLE = testFeeTable

const mocks = require('../mocks')

// Module Libraries
const { Queue } = require('@lulibrary/lag-utils')
const AlmaUser = require('alma-api-wrapper/src/user')

// Module under test
const updateFeeHandler = rewire('../../src/update-fee/handler')
const handler = (event = {}, ctx = {}) => new Promise((resolve, reject) => {
  updateFeeHandler.handle(event, ctx, (err, res) => {
    return err ? reject(err) : resolve(res)
  })
})

describe('update fee handler tests', () => {
  afterEach(() => {
    sandbox.restore()
    wires.forEach(wire => wire())
    wires = []
  })
  it('should export a handler function', () => {
    updateFeeHandler.handle.should.be.an.instanceOf(Function)
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
        updateFeeHandler.__set__('handleMessages', handleMessageStub),
        updateFeeHandler.__set__('updateFee', () => Promise.resolve())
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
      wires.push(updateFeeHandler.__set__('handleMessages', handleMessageStub))
      sandbox.stub(console, 'log')

      return handler().should.eventually.be.rejectedWith('An error has occured')
    })
  })

  describe('handleMessages method tests', () => {
    const handleMessages = updateFeeHandler.__get__('handleMessages')

    it('should call updateFee with each message body', () => {
      const testFeeIDs = [uuid(), uuid(), uuid()]
      const testBodies = testFeeIDs.map(id => JSON.stringify({ feeID: id }))
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

      const updateFeeStub = sandbox.stub()
      updateFeeStub.resolves()

      wires.push(
        updateFeeHandler.__set__('updateFee', updateFeeStub)
      )

      return handleMessages(testMessages)
        .then(() => {
          testFeeIDs.forEach(id => {
            updateFeeStub.should.have.been.calledWith({ feeID: id })
          })
        })
    })

    it('should default to an empty message array, and not call updateFee or deleteMessage', () => {
      const updateFeeStub = sandbox.stub()
      updateFeeStub.resolves()

      wires.push(
        updateFeeHandler.__set__('updateFee', updateFeeStub)
      )

      return handleMessages()
        .then(() => {
          updateFeeStub.should.not.have.been.called
        })
    })
  })

  describe('updateFee method tests', () => {
    const updateFee = updateFeeHandler.__get__('updateFee')

    it('should call createFeeFromApi with the Fee ID', () => {
      const createFeeStub = sandbox.stub()
      createFeeStub.resolves()

      wires.push(
        updateFeeHandler.__set__('createFeeFromApi', createFeeStub)
      )

      const testUserID = uuid()
      const testFeeID = uuid()

      return updateFee({ userID: testUserID, feeID: testFeeID })
        .then(() => {
          createFeeStub.should.have.been.calledWith(testUserID, testFeeID)
        })
    })
  })

  describe('end to end tests', () => {
    let apiStub, sendMessageStub, getParameterStub
    const putStub = mocks.putStub

    before(() => {
      const e2eSandbox = sinon.createSandbox()
      apiStub = e2eSandbox.stub(AlmaUser.prototype, 'getFee')
      sendMessageStub = e2eSandbox.stub()
      getParameterStub = e2eSandbox.stub()

      AWS_MOCK.mock('SQS', 'sendMessage', sendMessageStub)
      AWS_MOCK.mock('SSM', 'getParameter', getParameterStub)
    })

    after(() => {
      AWS_MOCK.restore('SQS')
      AWS_MOCK.restore('SSM')
    })

    afterEach(() => {
      apiStub.reset()
      putStub.reset()
      sendMessageStub.reset()
      getParameterStub.reset()
    })

    it('should query the API for each fee', () => {
      getParameterStub.callsArgWith(1, null, { Parameter: { Value: uuid() } })
      sendMessageStub.resolves()
      putStub.callsArgWith(1, null, {})

      const testFeeIDs = [uuid(), uuid(), uuid()]
      const testUserID = uuid()

      testFeeIDs.forEach((ID) => {
        apiStub.withArgs(ID).resolves({
          data: {
            id: ID,
            user_primary_id: testUserID
          }
        })
      })

      const testEvent = {
        Records: testFeeIDs.map(ID => {
          return { body: JSON.stringify({
            userID: testUserID,
            feeID: ID
          }) }
        })
      }

      return handler(testEvent, null)
        .then(() => {
          testFeeIDs.forEach((ID, index) => {
            apiStub.getCall(index).should.have.been.calledWith(ID)
          })
        })
    })

    it('should create a new Fee in the cache with each API response', () => {
      sandbox.stub(Date, 'now').returns(0)
      getParameterStub.callsArgWith(1, null, { Parameter: { Value: uuid() } })
      sendMessageStub.resolves()
      putStub.callsArgWith(1, null, {})

      const testFeeIDs = [uuid(), uuid(), uuid()]
      const testUserID = uuid()

      testFeeIDs.forEach((ID) => {
        apiStub.withArgs(ID).resolves({
          data: {
            id: ID,
            user_primary_id: testUserID
          }
        })
      })

      const testEvent = {
        Records: testFeeIDs.map(ID => {
          return { body: JSON.stringify({
            userID: testUserID,
            feeID: ID
          }) }
        })
      }

      return handler(testEvent, null)
        .then(() => {
          testFeeIDs.forEach((ID, index) => {
            putStub.getCall(index)
              .should.have.been.calledWith({
                TableName: testFeeTable,
                Item: {
                  id: {
                    S: ID
                  },
                  user_primary_id: {
                    S: testUserID
                  },
                  expiry_date: {
                    N: `${2 * 7 * 24 * 60 * 60}`
                  }
                }
              })
          })
        })
    })
  })
})
