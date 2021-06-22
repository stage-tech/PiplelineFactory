# Pipeline Factory

### Deployment

In a new AWS account execute the following setup steps:

1. In AWS Secrets Manager add a GitHub token with read access to code and packages under `/pipeline-factory/default-github-token`

2. Run the command:

```shell
 ./deploy.sh [aws-profile-name]
```

### Manually deploy a pipeline via the PLF PI

To manually deploy a pipeline for a given repository to an account.

1. In the target AWS account in API Gateways lookup the `PipeLine-Factory` API
1. In API stages go to `prod` and retrieve the invoke URL
1. In AWS console go to API Keys and retrieve `PipeLine-Factory-access-key` key value
1. Execute the following REST API call with settings updated:

```JSON
curl --location --request POST 'https://{API_GATEWAY_PROD_STAGE_URL}/branch-created' \
--header 'x-api-key: {API_KEY}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "event": "push",
    "repository_name": "{REPOSITORY_NAME}",
    "repository_owner": "{REPOSITORY_OWNER}",
    "branch": "{BRANCH_NAME}",
    "settings": {
        "monitoredBranches": [
            "{BRANCH_NAME}"
        ]
    }
}'
```