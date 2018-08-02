
const AlmaClient = require('alma-api-wrapper')
const { LoanSchema } = require('@lulibrary/lag-alma-utils')
const CacheLoan = LoanSchema(process.env.LOAN_CACHE_TABLE)
const getApiKey = require('../get-alma-api-key')

const createLoanFromApi = (userID, loanID) => getApiKey()
  .then(() => new AlmaClient().users.for(userID).getLoan(loanID))
  .then(createLoanInCache)

const createLoanInCache = (loan) => CacheLoan.create(loan.data)

module.exports = createLoanFromApi
