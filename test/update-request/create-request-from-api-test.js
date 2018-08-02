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
})
