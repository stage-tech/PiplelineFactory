import { Octokit } from '@octokit/rest';
import { decode } from 'js-base64';

import { Branch, Repository } from './models';

export interface ISourceControlClient {
  getRepository(owner: string, repositoryName: string): Promise<Repository>;

  findRepositories(organization: string): Promise<{ repositoryName: string; owner: string; id: string }[]>;

  fetchFile(owner: string, repo: string, branchName: string, filePath: string): Promise<string | null>;
}

export class GithubClient implements ISourceControlClient {
  private octokit: Octokit;
  constructor(token: string) {
    this.octokit = new Octokit({
      auth: token,
    });
  }

  async getRepository(owner: string, repositoryName: string): Promise<Repository> {
    const repo = await this.octokit.repos.get({
      owner: owner,
      repo: repositoryName,
    });

    const listBranchesResponse = await this.octokit.repos.listBranches({
      repo: repo.data.name,
      owner: owner,
    });

    const settingsFile = this.getPipelineFactorySettings(owner, repositoryName, repo.data.default_branch);

    return {
      name: repo.data.name,
      id: repo.data.id.toString(),
      owner: owner,
      defaultBranch: repo.data.default_branch,
      repositoryId: repo.data.id.toString(),
      topics: repo.data.topics,
      branches: listBranchesResponse.data.map((branch) => {
        return new Branch(branch.name, branch.commit.sha);
      }),
      settings: settingsFile,
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

  private async getPipelineFactorySettings(owner: string, repositoryName: string, branchName: string): Promise<any> {
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
