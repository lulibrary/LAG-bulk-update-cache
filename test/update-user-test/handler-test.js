const sinon = require('sinon')
const sandbox = sinon.createSandbox()
const mockRequire = require('mock-require')

mockRequire('@lulibrary/node-alma-api', {

})

const chai = require('chai')
chai.should()

// Module under test
const updateUserHandler = require('../../src/update-user/handler')

describe('update user handler tests', () => {
  it('should export a handler function', () => {
    updateUserHandler.handle.should.be.an.instanceOf(Function)
  })
})
