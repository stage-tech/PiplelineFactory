import AWS from 'aws-sdk';

import { CloudFormationManager, StackInformation } from './cloudformation-manager';
import { JobScheduler } from './JobScheduler';
import { Branch, Repository } from './models';
import { RepositoryExplorer } from './repository-explorer';

export class PipelineCoordinator {
  constructor(
    private repositoryExplorer: RepositoryExplorer,
    private cloudFormationManager: CloudFormationManager,
    private jobScheduler?: JobScheduler,
  ) {}

  async scheduleDiscoveryJobs(organizationName: string) {
    const repos = await this.repositoryExplorer.findSubscribedRepositories(organizationName);

    const result = await this.jobScheduler?.queueRepositoryDiscoveryJobs(repos);
    return result;
  }

  async createNewPipelines(repo: Repository) {
    const newBranches = await this.findNewBranches(repo);
    await Promise.all(
      newBranches.map(async (branch) => {
        return await this.cloudFormationManager.createPipeline(
          branch.repository.owner,
          branch.repository.name,
          branch.branchName,
        );
      }),
    );
  }

  private async findNewBranches(repo: Repository): Promise<Branch[]> {
    const buildConfiguration = await this.repositoryExplorer.findBranchConfigurations(repo);
    const monitoredBranch = buildConfiguration.monitoredBranches();
    const existingPipelines = await this.cloudFormationManager.findPipelineStacksForRepository(repo.owner, repo.name);

    const newBranches = monitoredBranch.filter(
      (monitoredBranch) =>
        !existingPipelines.find((exitingStack) => exitingStack.branchName == monitoredBranch.branchName),
    );
    return newBranches;
  }

  async removePipelines(repo: Repository) {
    const removedBranches = await this.findObsoletePipelines(repo);

    removedBranches.map((branch) => {
      return this.cloudFormationManager.deletePipeLineStack(branch.owner, branch.repository, branch.branchName);
    });
  }

  private async findObsoletePipelines(repo: Repository): Promise<StackInformation[]> {
    const buildConfiguration = await this.repositoryExplorer.findBranchConfigurations(repo);
    const existingPipelines = await this.cloudFormationManager.findPipelineStacksForRepository(repo.owner, repo.name);

    const monitoredBranches = buildConfiguration.monitoredBranches();

    const removedBranches = existingPipelines.filter(
      (existingPipeline) => !monitoredBranches.find((branch) => existingPipeline.branchName == branch.branchName),
    );
    return removedBranches;
  }
}
