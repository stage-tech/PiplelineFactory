import { Octokit } from '@octokit/rest';
import { decode } from 'js-base64';

export interface ISourceControlClient {
  getRepository(
    owner: string,
    repositoryName: string,
  ): Promise<{
    defaultBranch: string;
    topics: string[];
    repositoryId: string;
    branches: { branchName: string; commitSha: string }[];
  }>;

  findRepositories(organization: string): Promise<{ repositoryName: string; owner: string; id: string }[]>;

  getPipelineFactorySettings(owner: string, repositoryName: string, branchName: string): Promise<any>;

  fetchFile(owner: string, repo: string, branchName: string, filePath: string): Promise<string | null>;
}

export class GithubClient implements ISourceControlClient {
  private octokit: Octokit;
  constructor(token: string) {
    this.octokit = new Octokit({
      auth: token,
    });
  }
  async getRepository(
    owner: string,
    repositoryName: string,
  ): Promise<{
    defaultBranch: string;
    topics: string[];
    repositoryId: string;
    branches: { branchName: string; commitSha: string }[];
  }> {
    const repo = await this.octokit.repos.get({
      owner: owner,
      repo: repositoryName,
    });

    const listBranchesResponse = await this.octokit.repos.listBranches({
      repo: repo.data.name,
      owner: owner,
    });

    return {
      defaultBranch: repo.data.default_branch,
      repositoryId: repo.data.id.toString(),
      topics: repo.data.topics,
      branches: listBranchesResponse.data.map((branch) => {
        return {
          branchName: branch.name,
          commitSha: branch.commit.sha,
        };
      }),
    };
  }

  public async findRepositories(
    organization: string,
  ): Promise<{ repositoryName: string; owner: string; id: string }[]> {
    const repos = await this.octokit.paginate(this.octokit.repos.listForOrg, {
      org: organization,
    });

    return repos
      .filter((r) => true || r.name.startsWith('stage'))
      .map((r) => {
        return {
          repositoryName: r.name,
          owner: r.owner.login,
          id: r.id.toString(),
        };
      });
  }

  public async getPipelineFactorySettings(owner: string, repositoryName: string, branchName: string): Promise<any> {
    const settingsFileContent: any = await this.fetchFile(
      owner,
      repositoryName,
      branchName,
      'pipeline-factory.settings',
    );

    const settingsFileJSON = JSON.parse(settingsFileContent);
    return settingsFileJSON;
  }

  public async fetchFile(owner: string, repo: string, branchName: string, filePath: string): Promise<string | null> {
    let settingsFileContent;
    return await this.octokit.repos
      .getContent({
        owner: owner,
        repo: repo,
        ref: branchName,
        path: filePath,
      })
      .then((settingsFileResponse) => {
        if (settingsFileResponse.status == 200) {
          settingsFileContent = decode(settingsFileResponse.data.content);
          return settingsFileContent;
        } else {
          return null;
        }
      })
      .catch((e) => {
        if (e.status != '404') {
          console.error(JSON.stringify(e, null, 4));
        }
        return null;
      });
  }
}
