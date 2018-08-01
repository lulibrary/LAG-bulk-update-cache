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
const { RequestSchema } = require('@lulibrary/lag-alma-utils')
const Request = RequestSchema(process.env.LOAN_CACHE_TABLE)

// Alma API
const AlmaApiUser = require('alma-api-wrapper/src/user')

const rewire = require('rewire')
let wires = []

// Module under test
const createRequestFromApi = rewire('../../src/update-request/create-request-from-api')

describe('create-request-from-api tests', () => {
  afterEach(() => {
    sandbox.restore()
    wires.forEach(wire => wire())
    wires = []
  })

  describe('createRequest method tests', () => {
    it('should call Request#create', () => {
      const createStub = sandbox.stub(Request, 'create')
      createStub.resolves()
      const createRequest = createRequestFromApi.__get__('createRequestInCache')

      const testRequestID = uuid()

      const testRequestData = { data: {
        request_id: testRequestID,
        title: 'test_request_title',
        user_id: 'test_user_id'
      }}

      return createRequest(testRequestData)
        .then((testRequest) => {
          createStub.should.have.been.calledWith({
            request_id: testRequestID,
            title: 'test_request_title',
            user_id: 'test_user_id'
          })
        })
    })
  })

  describe('getRequestData method tests', () => {
    const getData = createRequestFromApi.__get__('getRequestData')
    before(() => {
      process.env.ALMA_KEY = uuid()
    })

    after(() => {
      delete process.env.ALMA_KEY
    })

    it('should call apiUser#getRequest', () => {
      const getRequestStub = sandbox.stub(AlmaApiUser.prototype, 'getRequest')
      getRequestStub.resolves()

      const testUserID = uuid()
      const testRequestID = uuid()

      return getData(testUserID, testRequestID)
        .then(() => {
          getRequestStub.should.have.been.calledOnce
          getRequestStub.should.have.been.calledWith(testRequestID)
        })
    })
  })

  describe('createRequestFromApi method tests', () => {
    it('should call createRequestInCache with the result of getRequestData', () => {
      const testRequestID = uuid()
      const testTitle = `test_title_${uuid()}`
      const testUserID = uuid()

      const getDataStub = sandbox.stub()
      const createRequestStub = sandbox.stub()
      wires.push(createRequestFromApi.__set__('getRequestData', getDataStub))
      wires.push(createRequestFromApi.__set__('createRequestInCache', createRequestStub))
      wires.push(createRequestFromApi.__set__('getApiKey', () => Promise.resolve()))

      getDataStub.resolves({
        id: testRequestID,
        title: testTitle,
        user_id: testUserID
      })
      createRequestStub.resolves()

      return createRequestFromApi(testRequestID)
        .then(() => {
          createRequestStub.should.have.been.calledWith({
            id: testRequestID,
            title: testTitle,
            user_id: testUserID
          })
        })
    })
  })
})
