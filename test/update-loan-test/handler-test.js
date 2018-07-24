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
    it('should call receiveMessages on the Loans Queue', () => {
      const receiveMessagesStub = sandbox.stub(Queue.prototype, 'receiveMessages')
      receiveMessagesStub.resolves(true)

      wires.push(
        updateLoanHandler.__set__('handleMessages', () => Promise.resolve()),
        updateLoanHandler.__set__('updateLoan', () => Promise.resolve()),
        updateLoanHandler.__set__('deleteMessage', () => Promise.resolve())
      )

      return handler()
        .then(() => {
          receiveMessagesStub.should.have.been.called
        })
    })

    it('should call handleMessages with the response of recieveMesages', () => {
      const receiveMessagesStub = sandbox.stub(Queue.prototype, 'receiveMessages')
      receiveMessagesStub.resolves([{
        Body: 'test_message_body',
        ReceiptHandle: 'test_message_handle'
      }])

      const handleMessageStub = sandbox.stub()
      handleMessageStub.resolves()

      wires.push(
        updateLoanHandler.__set__('handleMessages', handleMessageStub),
        updateLoanHandler.__set__('updateLoan', () => Promise.resolve()),
        updateLoanHandler.__set__('deleteMessage', () => Promise.resolve())
      )

      return handler()
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
      wires.push(updateLoanHandler.__set__('handleMessages', handleMessageStub))
      sandbox.stub(console, 'log')

      return handler().should.eventually.be.rejectedWith('An error has occured')
    })
  })

  describe('handleMessages method tests', () => {
    const handleMessages = updateLoanHandler.__get__('handleMessages')

    it('should call updateLoan with each message body', () => {
      const testLoanIDs = [uuid(), uuid(), uuid()]
      const testMessages = [{
        Body: testLoanIDs[0],
        ReceiptHandle: uuid()
      }, {
        Body: testLoanIDs[1],
        ReceiptHandle: uuid()
      }, {
        Body: testLoanIDs[2],
        ReceiptHandle: uuid()
      }]

      // const receiveMessagesStub = sandbox.stub(Queue.prototype, 'receiveMessages')
      // receiveMessagesStub.resolves(testMessages)

      const updateLoanStub = sandbox.stub()
      updateLoanStub.resolves()

      wires.push(
        updateLoanHandler.__set__('updateLoan', updateLoanStub),
        updateLoanHandler.__set__('deleteMessage', () => Promise.resolve())
      )

      return handleMessages(testMessages)
        .then(() => {
          testMessages.forEach(message => {
            updateLoanStub.should.have.been.calledWith(message.Body)
          })
        })
    })

    it('should call deleteMessage with each message object', () => {
      const testReceiptHandles = [uuid(), uuid(), uuid()]
      const testMessages = [{
        Body: uuid(),
        ReceiptHandle: testReceiptHandles[0]
      }, {
        Body: uuid(),
        ReceiptHandle: testReceiptHandles[1]
      }, {
        Body: uuid(),
        ReceiptHandle: testReceiptHandles[2]
      }]

      // const receiveMessagesStub = sandbox.stub(Queue.prototype, 'receiveMessages')
      // receiveMessagesStub.resolves(testMessages)

      const deleteMessageStub = sandbox.stub()
      deleteMessageStub.resolves()

      wires.push(
        updateLoanHandler.__set__('updateLoan', () => Promise.resolve()),
        updateLoanHandler.__set__('deleteMessage', deleteMessageStub)
      )

      return handleMessages(testMessages)
        .then(() => {
          testMessages.forEach(message => {
            deleteMessageStub.should.have.been.calledWith(message)
          })
        })
    })

    it('should default to an empty message array, and not call updateLoan or deleteMessage', () => {
      const updateLoanStub = sandbox.stub()
      updateLoanStub.resolves()
      const deleteMessageStub = sandbox.stub()
      deleteMessageStub.resolves()

      wires.push(
        updateLoanHandler.__set__('updateLoan', updateLoanStub),
        updateLoanHandler.__set__('deleteMessage', deleteMessageStub)
      )

      return handleMessages()
        .then(() => {
          updateLoanStub.should.not.have.been.called
          deleteMessageStub.should.not.have.been.called
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

      const testLoanID = uuid()

      return updateLoan(testLoanID)
        .then(() => {
          createLoanStub.should.have.been.calledWith(testLoanID)
        })
    })
  })

  describe('deleteMessage method tests', () => {
    const deleteMessage = updateLoanHandler.__get__('deleteMessage')
    it('should call deleteMessage on the loans Queue', () => {
      const deleteMessageStub = sandbox.stub(Queue.prototype, 'deleteMessage')
      deleteMessageStub.resolves()

      const testHandle = uuid()

      const testMessage = {
        ReceiptHandle: testHandle
      }

      return deleteMessage(testMessage)
        .then(() => {
          deleteMessageStub.should.have.been.calledWith(testHandle)
        })
    })
  })
})
