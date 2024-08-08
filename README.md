# Pipeline Factory

## Deploying the Pipeline Factory to a new AWS Account

In a new AWS account execute the following setup steps:


1. Run the command:

```shell
 ./deploy.sh [aws-profile-name]
```

2. In AWS Secrets Manager update the secret `/pipeline-factory/default-github-token` with a GitHub token with read access to code and packages.

3. Activate the AWS CodeConnections connection for GitHub via AWS Console (it is PENDING after initial deployment).
This connection is then used for individual PLF CodePipeline deployments via SSM parameter `/pipeline-factory/default-github-connection`.

## Manually deploy a pipeline via the PLF API

To manually deploy a pipeline for a given repository to an account.

1. In the target AWS account in API Gateways lookup the `PipeLine-Factory` API
1. In API stages go to `prod` and retrieve the invoke URL
1. In AWS console go to API Keys and retrieve `PipeLine-Factory-access-key` key value
1. Execute the following REST API call with settings updated:

```JSONC
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

## Configure a Repository for Automatic Monitoring by the Pipeline Factory

To automatically bootstrap the pipelines for a repository apply the following configuration.

1. [Add a GitHub topic](https://docs.github.com/en/github/administering-a-repository/managing-repository-settings/classifying-your-repository-with-topics) to the repository matching the pattern: `pipeline-factory-{AWS_ACCOUNT_NUMBER}`
1. Add a configuration file to the root of the repository called `pipeline-factory.settings` using the following template:

```JSONC
{
  // name of s3 bucket to store build artifacts , if omitted default PLF bucket is used
  "artifactsBucketName": "s3 bucket name",
  // iam role to use for , if omitted default PLF BuildAsRole is used
  "buildAsRoleArn": "iam role arn",
  // relative location of build spec file , if omitted default is "./buildspec.yml"
  "buildspecFileLocation": "./scripts/custom_buildspec.yml",
  // an array of branch names that should be monitored by Pipeline Factory
  // "master" branch is default value and is always monitored even if not on the list.
  "monitoredBranches": ["feature-1", "bugfix-12", "test", "demo"],
  "notifications": [
    {
      "branches": ["master", "acc", "prod"],
      "event": "FAILED",
      "channelType": "SLACK",
      "channelId": "sphinx-team"
    }
  ]
}
```
