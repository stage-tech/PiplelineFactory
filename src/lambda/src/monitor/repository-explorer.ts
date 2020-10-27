import { ISourceControlClient } from './github-client';
import { Repository, RepositoryBuildConfiguration } from './models';
export class RepositoryExplorer {
  constructor(private client: ISourceControlClient) {}

  public async findSubscribedRepositories(organization: string): Promise<Repository[]> {
    const repos = await this.client.findSubscribedRepositories(organization);
    return repos;
  }

  private isMonitoredBranch(branchName: string, settings: any): boolean {
    const monitoredBranches = Array.isArray(settings?.monitoredBranches) ? settings.monitoredBranches : [];
    monitoredBranches.push('master');
    const isMonitoredBranch = monitoredBranches.includes(branchName);
    return isMonitoredBranch;
  }

  public async findBranchConfigurations(repo: Repository): Promise<RepositoryBuildConfiguration> {
    const branches = await this.client.findBranches(repo.owner, repo.name);
    const branchesWithSettings = await Promise.all(
      branches.map(async (b) => {
        const settings = await this.client.getPipelineFactorySettings(b);
        return { ...b, settings, isMonitoredBranch: this.isMonitoredBranch(b.branchName, settings) };
      }),
    );

    const repositoryBuildConfiguration: RepositoryBuildConfiguration = new RepositoryBuildConfiguration(repo);
    repositoryBuildConfiguration.branches = branchesWithSettings;
    return repositoryBuildConfiguration;
  }
}
