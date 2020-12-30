import AWS from 'aws-sdk';

import { CloudFormationManager } from './cloudformation-manager';
import { GithubClient } from './github-client';
import { JobScheduler } from './JobScheduler';
import { OrganizationManager } from './organization-manager';
import { PipelineCoordinator } from './pipeline-coordinator';
import { RepositoryExplorer } from './repository-explorer';

export class MonitorRepositoriesHandlerProps {
  queueUrl: string;
  organizationName: string;
  factoryCodeBuildProjectName: string;
}

export class MonitorRepositoriesHandler {
  constructor(private props: MonitorRepositoriesHandlerProps) {}
  public handler = async () => {
    const organizationInfo = await new OrganizationManager().get(this.props.organizationName);
    const githubClient = new GithubClient(organizationInfo.githubToken);
    const cloudFormationManager = new CloudFormationManager(this.props.factoryCodeBuildProjectName);
    const repositoryExplorer = new RepositoryExplorer(githubClient);
    const jobScheduler = new JobScheduler(this.props.queueUrl, new AWS.SQS());
    const coordinator = new PipelineCoordinator(repositoryExplorer, cloudFormationManager, jobScheduler);
    await coordinator.scheduleDiscoveryJobs(this.props.organizationName);
  };
}

const queueUrl = process.env.SQS_QUEUE_URL || '';
const organizationName = process.env.ORGANIZATION_NAME || 'stage-tech';

if (!process.env.FACTORY_CODEBUILD_PROJECT_NAME) {
  throw new Error(`process.env.FACTORY_CODEBUILD_PROJECT_NAME is not provided`);
}

export const handler = new MonitorRepositoriesHandler({
  queueUrl,
  organizationName,
  factoryCodeBuildProjectName: process.env.FACTORY_CODEBUILD_PROJECT_NAME,
}).handler;
