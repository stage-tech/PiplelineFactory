import lambda from 'aws-lambda';

import { CloudFormationManager } from './cloudformation-manager';
import { GithubClient } from './github-client';
import { DiscoveryJob, RepositoryBuildConfiguration } from './models';
import { OrganizationManager } from './organization-manager';
import { PipelineCoordinator } from './pipeline-coordinator';
import { RepositoryExplorer } from './repository-explorer';

export class PipelineManagementHandler {
  constructor(private factoryCodeBuildProjectName: string) {}
  public handler = async (event: lambda.SQSEvent): Promise<void> => {
    event.Records.forEach(async (sqsMessage) => {
      const job = <DiscoveryJob>JSON.parse(sqsMessage.body);
      console.debug(JSON.stringify(job, null, 4));
      const organizationInfo = await new OrganizationManager().get(job.owner);
      const githubClient = new GithubClient(organizationInfo.githubToken);
      const cloudFormationManager = new CloudFormationManager(this.factoryCodeBuildProjectName);
      const repositoryExplorer = new RepositoryExplorer(githubClient);
      const coordinator = new PipelineCoordinator(cloudFormationManager);
      const repository = await repositoryExplorer.getRepository(job.owner, job.name);
      const existingBranches = await cloudFormationManager.getBranchesWithStacks(repository.owner, repository.name);
      const configuration = new RepositoryBuildConfiguration(repository, existingBranches);
      await coordinator.createNewPipelines(configuration);
      await coordinator.cleanObsoletePipelines(configuration);
    });
  };
}

if (!process.env.FACTORY_CODEBUILD_PROJECT_NAME) {
  throw new Error(`process.env.FACTORY_CODEBUILD_PROJECT_NAME is not provided`);
}

export const handler = new PipelineManagementHandler(process.env.FACTORY_CODEBUILD_PROJECT_NAME).handler;
