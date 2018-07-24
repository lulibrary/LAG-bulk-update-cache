const sinon = require('sinon')
const sandbox = sinon.createSandbox()

const chai = require('chai')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.should()

const uuid = require('uuid')

// Dynamoose
process.env.LOAN_CACHE_TABLE = uuid()
const { LoanSchema } = require('@lulibrary/lag-alma-utils')
const Loan = LoanSchema(process.env.LOAN_CACHE_TABLE)

// Alma API
const AlmaApiUser = require('alma-api-wrapper/src/user')

const rewire = require('rewire')
let wires = []

// Module under test
const createLoanFromApi = rewire('../../src/update-loan/create-loan-from-api')

describe('create-loan-from-api tests', () => {
  afterEach(() => {
    sandbox.restore()
    wires.forEach(wire => wire())
    wires = []
  })

  describe('createLoan method tests', () => {
    it('should call Loan#create', () => {
      const createStub = sandbox.stub(Loan, 'create')
      createStub.resolves()
      const createLoan = createLoanFromApi.__get__('createLoanInCache')

      const testLoanID = uuid()

      const testLoanData = { data: {
        loan_id: testLoanID,
        title: 'test_loan_title',
        user_id: 'test_user_id'
      }}

      return createLoan(testLoanData)
        .then((testLoan) => {
          createStub.should.have.been.calledWith({
            loan_id: testLoanID,
            title: 'test_loan_title',
            user_id: 'test_user_id'
          })
        })
    })
  })

  describe('getLoanData method tests', () => {
    const getData = createLoanFromApi.__get__('getLoanData')
    before(() => {
      process.env.ALMA_KEY = uuid()
    })

    after(() => {
      delete process.env.ALMA_KEY
    })

    it('should call apiUser#getLoan', () => {
      const getLoanStub = sandbox.stub(AlmaApiUser.prototype, 'getLoan')
      getLoanStub.resolves()

      const testUserID = uuid()
      const testLoanID = uuid()

      return getData(testUserID, testLoanID)
        .then(() => {
          getLoanStub.should.have.been.calledOnce
          getLoanStub.should.have.been.calledWith(testLoanID)
        })
    })
  })

  describe('createLoanFromApi method tests', () => {
    it('should call createLoanInCache with the result of getLoanData', () => {
      const testLoanID = uuid()
      const testTitle = `test_title_${uuid()}`
      const testUserID = uuid()

      const getDataStub = sandbox.stub()
      const createLoanStub = sandbox.stub()
      wires.push(createLoanFromApi.__set__('getLoanData', getDataStub))
      wires.push(createLoanFromApi.__set__('createLoanInCache', createLoanStub))
      wires.push(createLoanFromApi.__set__('getApiKey', () => Promise.resolve()))

      getDataStub.resolves({
        id: testLoanID,
        title: testTitle,
        user_id: testUserID
      })
      createLoanStub.resolves()

      return createLoanFromApi(testLoanID)
        .then(() => {
          createLoanStub.should.have.been.calledWith({
            id: testLoanID,
            title: testTitle,
            user_id: testUserID
          })
        })
    })
  })
})
