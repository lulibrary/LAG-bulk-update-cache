const sinon = require('sinon')
const sandbox = sinon.createSandbox()

const AWS_MOCK = require('aws-sdk-mock')

const chai = require('chai')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.should()

const uuid = require('uuid')

// Module under test
const getAlmaApiKey = require('../src/get-alma-api-key')

describe('get alma api key module tests', () => {
  after(() => {
    AWS_MOCK.restore('SSM')
  })
  it('should call SSM getParameter', () => {
    const getParameterStub = sandbox.stub()
    getParameterStub.callsArgWith(1, null, true)
    AWS_MOCK.mock('SSM', 'getParameter', getParameterStub)

    const testKeyName = `Test_key_${uuid()}`
    process.env.ALMA_API_KEY_NAME = testKeyName

    return getAlmaApiKey()
      .then(() => {
        getParameterStub.should.have.been.calledWith({
          Name: testKeyName,
          WithDecryption: true
        })
      })
  })
})
