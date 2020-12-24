import { CloudFormationManager } from './cloudformation-manager';
import { ISourceControlClient } from './github-client';
import { Branch, Repository, RepositoryBuildConfiguration } from './models';
export class RepositoryExplorer {
  constructor(private client: ISourceControlClient, private cloudFormationManager: CloudFormationManager) {}

  public async findRepositories(
    organization: string,
  ): Promise<{ repositoryName: string; owner: string; id: string }[]> {
    const repos = await this.client.findRepositories(organization);
    return repos;
  }

  public async getRepositoryBuildConfiguration(repo: Repository): Promise<RepositoryBuildConfiguration> {
    const repository = await this.client.getRepository(repo.owner, repo.owner);
    const repositoryBranches = repository.branches;
    const branches = repositoryBranches.map((b) => new Branch(b.branchName, b.commitSha));
    const settingsFile = await this.client.getPipelineFactorySettings(repo.owner, repo.name, repo.defaultBranch);
    const existingPipelines = await this.cloudFormationManager.findPipelineStacksForRepository(repo.owner, repo.name);
    const branchesWithPipelines = existingPipelines.map((s) => s.branchName);
    const repositoryBuildConfiguration = new RepositoryBuildConfiguration(
      repository,
      branches,
      settingsFile,
      branchesWithPipelines,
    );
    return repositoryBuildConfiguration;
  }
}
