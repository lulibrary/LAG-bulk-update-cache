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

const testLoanTable = `loan_table_${uuid()}`
process.env.LOAN_CACHE_TABLE = testLoanTable

const mocks = require('../mocks')

// Module Libraries
const { Queue } = require('@lulibrary/lag-utils')
const AlmaUser = require('alma-api-wrapper/src/user')

// Module under test
const updateLoanHandler = rewire('../../src/update-loan/handler')
const handler = (event = {}, ctx = {}) => new Promise((resolve, reject) => {
  updateLoanHandler.handle(event, ctx, (err, res) => {
    return err ? reject(err) : resolve(res)
  })
})

describe('update loan handler tests', () => {
  afterEach(() => {
    sandbox.restore()
    wires.forEach(wire => wire())
    wires = []
  })
  it('should export a handler function', () => {
    updateLoanHandler.handle.should.be.an.instanceOf(Function)
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
        updateLoanHandler.__set__('handleMessages', handleMessageStub),
        updateLoanHandler.__set__('updateLoan', () => Promise.resolve())
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
      wires.push(updateLoanHandler.__set__('handleMessages', handleMessageStub))
      sandbox.stub(console, 'log')

      return handler().should.eventually.be.rejectedWith('An error has occured')
    })
  })

  describe('handleMessages method tests', () => {
    const handleMessages = updateLoanHandler.__get__('handleMessages')

    it('should call updateLoan with each message body', () => {
      const testLoanIDs = [uuid(), uuid(), uuid()]
      const testBodies = testLoanIDs.map(id => JSON.stringify({ loanID: id }))
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

      const updateLoanStub = sandbox.stub()
      updateLoanStub.resolves()

      wires.push(
        updateLoanHandler.__set__('updateLoan', updateLoanStub)
      )

      return handleMessages(testMessages)
        .then(() => {
          testLoanIDs.forEach(id => {
            updateLoanStub.should.have.been.calledWith({ loanID: id })
          })
        })
    })

    it('should default to an empty message array, and not call updateLoan or deleteMessage', () => {
      const updateLoanStub = sandbox.stub()
      updateLoanStub.resolves()

      wires.push(
        updateLoanHandler.__set__('updateLoan', updateLoanStub)
      )

      return handleMessages()
        .then(() => {
          updateLoanStub.should.not.have.been.called
        })
    })
  })

  describe('updateLoan method tests', () => {
    const updateLoan = updateLoanHandler.__get__('updateLoan')

    it('should call createLoanFromApi with the Loan ID', () => {
      const createLoanStub = sandbox.stub()
      createLoanStub.resolves()

      wires.push(
        updateLoanHandler.__set__('createLoanFromApi', createLoanStub)
      )

      const testUserID = uuid()
      const testLoanID = uuid()

      return updateLoan({ userID: testUserID, loanID: testLoanID })
        .then(() => {
          createLoanStub.should.have.been.calledWith(testUserID, testLoanID)
        })
    })
  })

  describe('end to end tests', () => {
    let apiStub, sendMessageStub, getParameterStub
    const putStub = mocks.putStub

    before(() => {
      const e2eSandbox = sinon.createSandbox()
      apiStub = e2eSandbox.stub(AlmaUser.prototype, 'getLoan')
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

    it('should query the API for each loan', () => {
      getParameterStub.callsArgWith(1, null, { Parameter: { Value: uuid() } })
      sendMessageStub.resolves()
      putStub.callsArgWith(1, null, {})

      const testLoanIDs = [uuid(), uuid(), uuid()]
      const testUserID = uuid()

      testLoanIDs.forEach((ID) => {
        apiStub.withArgs(ID).resolves({
          data: {
            loan_id: ID,
            user_id: testUserID
          }
        })
      })

      const testEvent = {
        Records: testLoanIDs.map(ID => {
          return { body: JSON.stringify({
            userID: testUserID,
            loanID: ID
          }) }
        })
      }

      return handler(testEvent, null)
        .then(() => {
          testLoanIDs.forEach((ID, index) => {
            apiStub.getCall(index).should.have.been.calledWith(ID)
          })
        })
    })

    it('should create a new Loan in the cache with each API response', () => {
      getParameterStub.callsArgWith(1, null, { Parameter: { Value: uuid() } })
      sendMessageStub.resolves()
      putStub.callsArgWith(1, null, {})

      const testLoanIDs = [uuid(), uuid(), uuid()]
      const testUserID = uuid()

      testLoanIDs.forEach((ID) => {
        apiStub.withArgs(ID).resolves({
          data: {
            loan_id: ID,
            user_id: testUserID
          }
        })
      })

      const testEvent = {
        Records: testLoanIDs.map(ID => {
          return { body: JSON.stringify({
            userID: testUserID,
            loanID: ID
          }) }
        })
      }

      return handler(testEvent, null)
        .then(() => {
          testLoanIDs.forEach((ID, index) => {
            putStub.getCall(index)
              .should.have.been.calledWith({
                TableName: testLoanTable,
                Item: {
                  loan_id: {
                    S: ID
                  },
                  user_id: {
                    S: testUserID
                  },
                  expiry_date: {
                    N: '0'
                  }
                }
              })
          })
        })
    })
  })
})
