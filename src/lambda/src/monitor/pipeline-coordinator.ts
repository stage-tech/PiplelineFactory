import { CloudFormationManager, StackInformation } from './cloudformation-manager';
import { JobScheduler } from './JobScheduler';
import { RepositoryBuildConfiguration } from './models';
import { RepositoryExplorer } from './repository-explorer';

export class PipelineCoordinator {
  constructor(
    private repositoryExplorer: RepositoryExplorer,
    private cloudFormationManager: CloudFormationManager,
    private jobScheduler?: JobScheduler,
  ) {}

  async scheduleDiscoveryJobs(organizationName: string) {
    const repos = await this.repositoryExplorer.listRepositories(organizationName);
    const result = await this.jobScheduler?.queueRepositoryDiscoveryJobs(repos);
    return result;
  }

  async createNewPipelines(buildConfigurations: RepositoryBuildConfiguration) {
    if (!buildConfigurations.shouldBeMonitored()) {
      console.log('repository is not configured for monitoring , skipping');
      return;
    }

    const newBranches = buildConfigurations.branchesToAdd();
    await Promise.all(
      newBranches.map(async (branch) => {
        return await this.cloudFormationManager.createPipeline(buildConfigurations, branch.branchName);
      }),
    );
  }

  async cleanObsoletePipelines(buildConfigurations: RepositoryBuildConfiguration) {
    buildConfigurations.obsoletePipelines().map((branch) => {
      return this.cloudFormationManager.deletePipeLineStack(
        buildConfigurations.repository.owner,
        buildConfigurations.repository.name,
        branch.branchName,
      );
    });
  }
}
