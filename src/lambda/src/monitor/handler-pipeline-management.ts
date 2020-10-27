import lambda from 'aws-lambda';

import { CloudFormationManager } from './cloudformation-manager';
import { GithubClient } from './github-client';
import { JobScheduler } from './JobScheduler';
import { Repository } from './models';
import { OrganizationManager } from './organization-manager';
import { PipelineCoordinator } from './pipeline-coordinator';
import { RepositoryExplorer } from './repository-explorer';

export class PipelineManagementHandler {
  constructor(private organizationName: string) {}

  public handler = async (event: lambda.SQSEvent, context: any) => {
    event.Records.forEach(async (sqsMessage) => {
      const repository = <Repository>JSON.parse(sqsMessage.body);
      const organizationInfo = await new OrganizationManager().get(repository.owner);
      const githubClient = new GithubClient(organizationInfo.githubToken);
      const repositoryExplorer = new RepositoryExplorer(githubClient);
      const cloudFormationManager = new CloudFormationManager();
      const coordinator = new PipelineCoordinator(repositoryExplorer, cloudFormationManager);
    });
  };
}

const organizationName = process.env.ORGANIZATION_NAME || 'stage-tech';
export const handler = new PipelineManagementHandler(organizationName).handler;
