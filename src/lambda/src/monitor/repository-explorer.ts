import { CloudFormationManager } from './cloudformation-manager';
import { ISourceControlClient } from './github-client';
import { Repository, RepositoryBuildConfiguration } from './models';
export class RepositoryExplorer {
  constructor(private client: ISourceControlClient, private cloudFormationManager: CloudFormationManager) {}

  public async getRepository(owner: string, repositoryName: string): Promise<Repository> {
    return await this.client.getRepository(owner, repositoryName);
  }

  public async listRepositories(organization: string): Promise<{ name: string; owner: string }[]> {
    const repos = await this.client.findRepositories(organization);
    return repos;
  }

  public async getRepositoryBuildConfiguration(repo: Repository): Promise<RepositoryBuildConfiguration> {
    const existingPipelines = await this.cloudFormationManager.findPipelineStacksForRepository(repo.owner, repo.name);
    const branchesWithPipelines = existingPipelines.map((s) => s.branchName);
    const repositoryBuildConfiguration = new RepositoryBuildConfiguration(repo, branchesWithPipelines);
    return repositoryBuildConfiguration;
  }
}
