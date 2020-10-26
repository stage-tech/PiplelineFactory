import AWS from 'aws-sdk';

import { Repository } from './monitor/github-client';
import { OrganizationManager } from './monitor/organization-manager';
import { RepositoryExplorer } from './monitor/repository-explorer';

export class MonitorRepositoriesHandlerProps {
  queueUrl: string;
  organizationName: string;
}

export class MonitorRepositoriesHandler {
  constructor(private props: MonitorRepositoriesHandlerProps) {}
  public handler = async (event: any, context: any) => {
    const organizationInfo = await new OrganizationManager().get(this.props.organizationName);

    const repositoryExplorer = new RepositoryExplorer(organizationInfo.githubToken);
    const repos = await repositoryExplorer.findSubscribedRepositories(organizationInfo.name);

    const result = await this.queueRepositoryDiscoveryJobs(repos);
    return result;
  };

  private async queueRepositoryDiscoveryJobs(repos: Repository[]) {
    const sqsClient = new AWS.SQS();
    return Promise.all(
      repos.map(async (r) => {
        const request: AWS.SQS.SendMessageRequest = {
          QueueUrl: this.props.queueUrl,
          MessageBody: JSON.stringify(r),
        };
        await sqsClient.sendMessage(request).promise();
      }),
    );
  }
}

const queueUrl = process.env.SQS_QUEUE_URL || '';
const organizationName = process.env.ORGANIZATION_NAME || 'stage-tech';
export const handler = new MonitorRepositoriesHandler({ queueUrl, organizationName }).handler;
