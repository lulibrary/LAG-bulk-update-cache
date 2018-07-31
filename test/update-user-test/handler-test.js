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

// Module Libraries
const { Queue } = require('@lulibrary/lag-utils')

// Module under test
const updateUserHandler = rewire('../../src/update-user/handler')
const handler = (event = {}, ctx = {}) => new Promise((resolve, reject) => {
  updateUserHandler.handle(event, ctx, (err, res) => {
    return err ? reject(err) : resolve(res)
  })
})

describe('update user handler tests', () => {
  afterEach(() => {
    sandbox.restore()
    wires.forEach(wire => wire())
    wires = []
  })
  it('should export a handler function', () => {
    updateUserHandler.handle.should.be.an.instanceOf(Function)
  })

  describe('handler method tests', () => {
    it('should call handleMessages with the event Records', () => {
      const testEvent = { Records: [{
        Body: 'test_message_body',
        ReceiptHandle: 'test_message_handle'
      }]}

      const handleMessageStub = sandbox.stub()
      handleMessageStub.resolves()

      wires.push(
        updateUserHandler.__set__('handleMessages', handleMessageStub),
        updateUserHandler.__set__('updateUser', () => Promise.resolve()),
        updateUserHandler.__set__('handleLoansAndRequests', () => Promise.resolve())
      )

      return handler(testEvent)
        .then(() => {
          handleMessageStub.should.have.been.calledWith([{
            Body: 'test_message_body',
            ReceiptHandle: 'test_message_handle'
          }])
        })
    })

    it('should callback with an error if handleMessages is rejected', () => {
      sandbox.stub(Queue.prototype, 'receiveMessages').resolves()
      const handleMessageStub = sandbox.stub()
      handleMessageStub.rejects()
      wires.push(updateUserHandler.__set__('handleMessages', handleMessageStub))
      sandbox.stub(console, 'log')

      return handler().should.eventually.be.rejectedWith('An error has occured')
    })
  })

  describe('handleMessages method tests', () => {
    const handleMessages = updateUserHandler.__get__('handleMessages')

    it('should call updateUser with each message body', () => {
      const testUserIDs = [uuid(), uuid(), uuid()]
      const testMessages = [{
        Body: testUserIDs[0],
        ReceiptHandle: uuid()
      }, {
        Body: testUserIDs[1],
        ReceiptHandle: uuid()
      }, {
        Body: testUserIDs[2],
        ReceiptHandle: uuid()
      }]

      const testEvent = { Records: testMessages }

      const updateUserStub = sandbox.stub()
      updateUserStub.resolves()

      wires.push(
        updateUserHandler.__set__('updateUser', updateUserStub),
        updateUserHandler.__set__('handleLoansAndRequests', () => Promise.resolve())
      )

      return handler(testEvent)
        .then(() => {
          testMessages.forEach(message => {
            updateUserStub.should.have.been.calledWith(message.Body)
          })
        })
    })

    it('should default to an empty message array, and not call updateUser', () => {
      const updateUserStub = sandbox.stub()
      updateUserStub.resolves()

      wires.push(
        updateUserHandler.__set__('updateUser', updateUserStub)
      )

      return handleMessages()
        .then(() => {
          updateUserStub.should.not.have.been.called
        })
    })
  })

  describe('updateUser method tests', () => {
    const updateUser = updateUserHandler.__get__('updateUser')

    it('should call createUserFromApi with the user ID', () => {
      const createUserStub = sandbox.stub()
      createUserStub.resolves()

      wires.push(
        updateUserHandler.__set__('handleLoansAndRequests', () => Promise.resolve()),
        updateUserHandler.__set__('createUserFromApi', createUserStub)
      )

      const testUserID = uuid()

      return updateUser(testUserID)
        .then(() => {
          createUserStub.should.have.been.calledWith(testUserID)
        })
    })

    it('should call handleLoansAndRequests with the result of createUserFromApi', () => {
      const createUserStub = sandbox.stub()
      const testUser = {
        primary_id: uuid(),
        loan_ids: [uuid(), uuid()],
        request_ids: [uuid(), uuid(), uuid()]
      }
      createUserStub.resolves(testUser)

      const handleLsAndRsStub = sandbox.stub()
      handleLsAndRsStub.resolves()

      wires.push(
        updateUserHandler.__set__('handleLoansAndRequests', handleLsAndRsStub),
        updateUserHandler.__set__('createUserFromApi', createUserStub)
      )

      const testUserID = uuid()

      return updateUser(testUserID)
        .then(() => {
          handleLsAndRsStub.should.have.been.calledWith(testUser)
        })
    })
  })

  describe('handleLoansAndRequests method tests', () => {
    before(() => {
      process.env.LOANS_QUEUE_URL = uuid()
      process.env.REQUESTS_QUEUE_URL = uuid()
    })

    after(() => {
      delete process.env.LOANS_QUEUE_URL
      delete process.env.REQUESTS_QUEUE_URL
    })
    const handleLoansAndRequests = updateUserHandler.__get__('handleLoansAndRequests')

    it('should call sendToQueue with the Loans Queue URL and the loan IDs', () => {
      const sendToQueueStub = sandbox.stub()
      sendToQueueStub.resolves()

      wires.push(
        updateUserHandler.__set__('sendToQueue', sendToQueueStub)
      )

      const testUserID = uuid()
      const testLoans = [uuid(), uuid(), uuid(), uuid()]

      const testUser = {
        primary_id: testUserID,
        loan_ids: testLoans,
        request_ids: []
      }

      const expected = [{
        loanID: testLoans[0],
        userID: testUserID
      }, {
        loanID: testLoans[1],
        userID: testUserID
      }, {
        loanID: testLoans[2],
        userID: testUserID
      }, {
        loanID: testLoans[3],
        userID: testUserID
      }].map(JSON.stringify)

      return handleLoansAndRequests(testUser)
        .then(() => {
          sendToQueueStub.should.have.been.calledWith(process.env.LOANS_QUEUE_URL, expected)
        })
    })

    it('should call sendToQueue with the Requests Queue URL and the request IDs', () => {
      const sendToQueueStub = sandbox.stub()
      sendToQueueStub.resolves()

      wires.push(
        updateUserHandler.__set__('sendToQueue', sendToQueueStub)
      )

      const testUserID = uuid()
      const testRequests = [uuid(), uuid(), uuid(), uuid()]

      const testUser = {
        primary_id: testUserID,
        request_ids: testRequests,
        loan_ids: []
      }

      const expected = [{
        requestID: testRequests[0],
        userID: testUserID
      }, {
        requestID: testRequests[1],
        userID: testUserID
      }, {
        requestID: testRequests[2],
        userID: testUserID
      }, {
        requestID: testRequests[3],
        userID: testUserID
      }].map(JSON.stringify)

      return handleLoansAndRequests(testUser)
        .then(() => {
          sendToQueueStub.should.have.been.calledWith(process.env.REQUESTS_QUEUE_URL, expected)
        })
    })
  })
})
