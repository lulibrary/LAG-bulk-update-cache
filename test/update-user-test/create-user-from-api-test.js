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
process.env.USER_CACHE_TABLE = uuid()
const { UserSchema } = require('@lulibrary/lag-alma-utils')
const User = UserSchema(process.env.USER_CACHE_TABLE)

// Alma API
const AlmaClient = require('alma-api-wrapper')
const AlmaApiUser = require('alma-api-wrapper/src/user')

const rewire = require('rewire')
let wires = []

// Module under test
const createUserFromApi = rewire('../../src/update-user/create-user-from-api')

describe('create-user-from-api tests', () => {
  afterEach(() => {
    sandbox.restore()
    wires.forEach(wire => wire())
    wires = []
  })

  describe('createUser method tests', () => {
    it('should call User#create', () => {
      const createStub = sandbox.stub(User, 'create')
      createStub.resolves()
      const createUser = createUserFromApi.__get__('createUserInCache')

      const testUserID = uuid()

      const testUserData = {
        id: testUserID,
        loans: new Map(),
        requests: new Map(),
        fees: new Map()
      }

      return createUser(testUserData)
        .then((testUser) => {
          createStub.should.have.been.calledWith({
            primary_id: testUserID,
            loan_ids: [],
            request_ids: [],
            fee_ids: []
          })
        })
    })

    it('should create arrays of the loan, request and fee IDs', () => {
      const createStub = sandbox.stub(User, 'create')
      createStub.resolves()
      const createUser = createUserFromApi.__get__('createUserInCache')

      const testUserID = uuid()

      const loanIDs = [uuid(), uuid(), uuid()]
      const requestIDs = [uuid(), uuid(), uuid()]

      const testUserData = {
        id: testUserID,
        loans: new Map(loanIDs.map(id => [id, null])),
        requests: new Map(requestIDs.map(id => [id, null])),
        fees: new Map()
      }

      return createUser(testUserData)
        .then((testUser) => {
          createStub.should.have.been.calledWith({
            primary_id: testUserID,
            loan_ids: loanIDs,
            request_ids: requestIDs,
            fee_ids: []
          })
        })
    })
  })

  describe('getUserData method tests', () => {
    const getData = createUserFromApi.__get__('getUserData')
    before(() => {
      process.env.ALMA_KEY = uuid()
    })

    after(() => {
      delete process.env.ALMA_KEY
    })

    it('should call apiUser#loans, apiUser#requests, apiUser#fees', () => {
      const loansStub = sandbox.stub(AlmaApiUser.prototype, 'loans')
      const requestsStub = sandbox.stub(AlmaApiUser.prototype, 'requests')
      const feesStub = sandbox.stub(AlmaApiUser.prototype, 'fees')
      loansStub.resolves()
      requestsStub.resolves()
      feesStub.resolves()

      const testUserID = uuid()

      return getData(testUserID)
        .then(() => {
          loansStub.should.have.been.calledOnce
          requestsStub.should.have.been.calledOnce
          feesStub.should.have.been.calledOnce
        })
    })

    it('should return Loan, Request and Fee Maps from the API responses', () => {
      const testLoans = new Map([uuid(), uuid(), uuid()].map(id => [id, uuid()]))
      const testRequests = new Map([uuid(), uuid(), uuid()].map(id => [id, uuid()]))
      const testFees = new Map([uuid(), uuid(), uuid()].map(id => [id, uuid()]))
      const loansStub = sandbox.stub(AlmaApiUser.prototype, 'loans')
      const requestsStub = sandbox.stub(AlmaApiUser.prototype, 'requests')
      const feesStub = sandbox.stub(AlmaApiUser.prototype, 'fees')
      loansStub.resolves(testLoans)
      requestsStub.resolves(testRequests)
      feesStub.resolves(testFees)

      const testUserID = uuid()

      return getData(testUserID)
        .then(userData => {
          userData.loans.should.deep.equal(testLoans)
          userData.requests.should.deep.equal(testRequests)
          userData.fees.should.deep.equal(testFees)
        })
    })
  })

  describe('createUserFromApi method tests', () => {
    it('should call createUserInCache with the result of getUserData', () => {
      const testUserID = uuid()
      const testLoans = new Map([uuid(), uuid(), uuid()].map(id => [id, uuid()]))
      const testRequests = new Map([uuid(), uuid(), uuid()].map(id => [id, uuid()]))
      const testFees = new Map([uuid(), uuid(), uuid()].map(id => [id, uuid()]))

      const getDataStub = sandbox.stub()
      const createUserStub = sandbox.stub()
      wires.push(createUserFromApi.__set__('getUserData', getDataStub))
      wires.push(createUserFromApi.__set__('createUserInCache', createUserStub))
      wires.push(createUserFromApi.__set__('getApiKey', () => Promise.resolve()))
      getDataStub.resolves({
        id: testUserID,
        loans: testLoans,
        requests: testRequests,
        fees: testFees
      })
      createUserStub.resolves()

      return createUserFromApi(testUserID)
        .then(() => {
          createUserStub.should.have.been.calledWith({
            id: testUserID,
            loans: testLoans,
            requests: testRequests,
            fees: testFees
          })
        })
    })
  })
})
