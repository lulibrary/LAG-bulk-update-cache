# LAG-sns-update-cache
A serverless application on AWS Lambda for updating a DynamoDB cache of Alma data. 

This service is built on the [serverless](https://serverless.com/) framework.

The service is intended to process messages on an existing `Users` queue, where each message should be an Alma User `primary_id`. The service also creates additional `Loans`, `Requests` and `Fees` queues, to which it writes the respective IDs for those records, and then processes those messages.

The service consists of four AWS Lambda functions, `update-user`, `update-loan`, `update-request` and `update-fee`. All Lambdas are invoked through the SQS Lambda integration on the respective Queue. All Lambdas also retrieve the required Alma API key from an existing SSM parameter.

### update-user
The `update-user` Lambda queries the Alma API for the given user's `loans`, `requests` and `fees`. It creates a DynamoDB user record of the user ID, and a list of each of the `loan`, `request` and `fee` IDs. Additionally it sends a message for each of the `loan`, `request` and `fee` IDs to the relevant queue, as a stringified JSON object containing the ID and corresponding User ID. An example loan message would be:
```
'{"userID":"test_user","loanID":"test_loan"}'
```

### update-loan
This queries the Alma API for the given user loan, and creates a DynamoDB loan record from the API response.

### update-request
This queries the Alma API for the given user request, and creates a DynamoDB request record from the API response.

### update-fee
This queries the Alma API for the given user fee, and creates a DynamoDB fee record from the API response.

## Usage

The service can be deployed using the command
`sls deploy --stage <STAGE> --region <REGION>`

There are two valid stages defined in the `serverless.yml` configuration file. These are `stg` and `prod`. Environment variables for the SQS Users queue URL and ARN, and the User, Loan and Request DynamoDB table names should be set for the chosen stage. The name of the Alma API key SSM parameter should also be provided. The full set of environment variable names is:

Resource | Staging | Production
--- | --- | ---
User Queue URL | `USER_QUEUE_URL_STG` | `USER_QUEUE_URL_PROD`
User Queue ARN | `USER_QUEUE_ARN_STG` | `USER_QUEUE_ARN_PROD`
User Table Name | `USER_CACHE_TABLE_NAME_STG` | `USER_CACHE_TABLE_NAME_PROD`
Loan Table Name | `LOAN_CACHE_TABLE_NAME_STG` | `LOAN_CACHE_TABLE_NAME_PROD`
Request Table Name | `REQUEST_CACHE_TABLE_NAME_STG` | `REQUEST_CACHE_TABLE_NAME_PROD`
Alma API Key Name | `ALMA_API_KEY_NAME` | `ALMA_API_KEY_NAME`

Deploying the service will create the four lambdas with integrations to the respective SQS Queue. It will also create Loan, Request and Fee SQS Queues, with corresponding dead letter queues and redrive policies to push messages to the relevant DLQ after 3 failed receives. The DLQs are configured to retain messages for two weeks. The service also creates a DynamoDB Fee table.

## Associated Services

There are four services that make up the Alma caching stack. These are:

- [alma-webhook-handler](https://github.com/lulibrary/alma-webhook-handler)       -   passes Alma webhook data to SNS topics :
- [LAG-sns-update-cache](https://github.com/lulibrary/LAG-sns-update-cache)       -   writes webhook data from SNS topics to  DynanoDB
- [LAG-bulk-update-cache](https://github.com/lulibrary/LAG-bulk-update-cache)     -   updates DynamoDB with data from Alma API for queued records
- [LAG-api-gateway](https://github.com/lulibrary/LAG-api-gateway)                 -   provides a REST API for cached Alma data with fallback to Alma API

There are also 3 custom packages on which these depend. These are:
- [LAG-Utils](https://github.com/lulibrary/LAG-Utils)                             -   utility library for AWS services
- [LAG-Alma-Utils](https://github.com/lulibrary/LAG-Alma-Utils)                   -   utility library for DynamoDB cache schemas
- [node-alma-api-wrapper](https://github.com/lulibrary/node-alma-api-wrapper)     -   utility library for querying Alma API


## Development
Contributions to this service or any of the associated services and packages are welcome.
