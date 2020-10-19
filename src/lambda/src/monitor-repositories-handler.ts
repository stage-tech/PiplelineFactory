import * as lambda from 'aws-lambda';
import AWS from 'aws-sdk';
import uuid from 'uuid';

import { RepositoryExplorer } from './monitor/repository-explorer';
class MonitorRepositoriesHandler {
  sqsClient: AWS.SQS;
  constructor(private queueUrl: string, private tokenSecretName: string, private organization: string) {
    this.sqsClient = new AWS.SQS();
  }
  public handler = async (event: any, context: any) => {
    const secretManager = new AWS.SecretsManager();
    const token = await secretManager.getSecretValue({ SecretId: this.tokenSecretName }).promise();

    const repositoryExplorer = new RepositoryExplorer(token.SecretString || '');
    const repos = await repositoryExplorer.findSubscribedRepositories(this.organization);
    const request: AWS.SQS.SendMessageBatchRequest = {
      Entries: [],
      QueueUrl: this.queueUrl,
    };

    repos.forEach((r) => {
      request.Entries.push({
        Id: uuid.v4(),
        MessageBody: JSON.stringify(r),
      });
    });

    const result = await this.sqsClient.sendMessageBatch(request).promise();
    return result;
  };
}

const sqsUrl = process.env.SQS_QUEUE_URL || '';
const tokenSecretName = process.env.GITHUB_TOKEN_SECRET_NAME || '';
const organization = process.env.ORGANIZATION_NAME || 'stage-tech';
export const handler = new MonitorRepositoriesHandler(sqsUrl, tokenSecretName, organization).handler;
