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
process.env.FEE_CACHE_TABLE = uuid()
const { FeeSchema } = require('@lulibrary/lag-alma-utils')
const Fee = FeeSchema(process.env.FEE_CACHE_TABLE)

// Alma API
const AlmaApiUser = require('alma-api-wrapper/src/user')

const rewire = require('rewire')
let wires = []

// Module under test
const createFeeFromApi = rewire('../../src/update-fee/create-fee-from-api')

describe('create-fee-from-api tests', () => {
  afterEach(() => {
    sandbox.restore()
    wires.forEach(wire => wire())
    wires = []
  })

  describe('createFee method tests', () => {
    it('should call Fee#create', () => {
      const createStub = sandbox.stub(Fee, 'create')
      createStub.resolves()
      const createFee = createFeeFromApi.__get__('createFeeInCache')

      const testFeeID = uuid()

      const testFeeData = { data: {
        fee_id: testFeeID,
        title: 'test_fee_title',
        user_id: 'test_user_id'
      }}

      return createFee(testFeeData)
        .then((testFee) => {
          createStub.should.have.been.calledWith({
            fee_id: testFeeID,
            title: 'test_fee_title',
            user_id: 'test_user_id'
          })
        })
    })
  })
})
