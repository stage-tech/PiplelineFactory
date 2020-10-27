import { settings } from 'cluster';

import { Branch, GithubClient, Repository, RepositoryBuildConfiguration } from './github-client';
export class RepositoryExplorer {
  private client: GithubClient;
  constructor(token: string) {
    this.client = new GithubClient(token);
  }

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

  public async getBuildConfiguration(repo: Repository): Promise<RepositoryBuildConfiguration> {
    const branches = await this.client.findBranches(repo);
    const branchesWithSettings = await Promise.all(
      branches.map(async (b) => {
        const settings = await this.client.getPipelineFactorySettings(b);
        return { ...b, settings, isMonitoredBranch: this.isMonitoredBranch(b.branchName, settings) };
      }),
    );

    const repositoryBuildConfiguration: RepositoryBuildConfiguration = {
      ...repo,
      branches: branchesWithSettings,
    };

    return repositoryBuildConfiguration;
  }
}
