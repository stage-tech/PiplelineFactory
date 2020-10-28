import lambda from 'aws-lambda';
import { CloudFormationManager } from './cloudformation-manager';
import { GithubClient } from './github-client';
import { Repository } from './models';
import { OrganizationManager } from './organization-manager';
import { PipelineCoordinator } from './pipeline-coordinator';
import { RepositoryExplorer } from './repository-explorer';

export class PipelineManagementHandler {
  public handler = async (event: lambda.SQSEvent, context: any) => {
    event.Records.forEach(async (sqsMessage) => {
      const repository = <Repository>JSON.parse(sqsMessage.body);
      console.debug(JSON.stringify(repository, null, 4));
      const organizationInfo = await new OrganizationManager().get(repository.owner);
      const githubClient = new GithubClient(organizationInfo.githubToken);
      const repositoryExplorer = new RepositoryExplorer(githubClient);
      const cloudFormationManager = new CloudFormationManager();
      const coordinator = new PipelineCoordinator(repositoryExplorer, cloudFormationManager);
      await coordinator.createNewPipelines(repository);
      await coordinator.removePipelines(repository);
    });
  };
}

export const handler = new PipelineManagementHandler().handler;
