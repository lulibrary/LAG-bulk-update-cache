
const AlmaClient = require('alma-api-wrapper')
const { LoanSchema } = require('@lulibrary/lag-alma-utils')
const CacheLoan = LoanSchema(process.env.LOAN_CACHE_TABLE)

const createLoanFromApi = (userID, loanID) => getLoanData(userID, loanID).then(createLoanInCache)

const getLoanData = (userID, loanID) => {
  const almaApi = new AlmaClient()
  return almaApi.users.for(userID).getLoan(loanID)
}

const createLoanInCache = (loan) => CacheLoan.create(loan.data)

module.exports = createLoanFromApi