import { Octokit } from '@octokit/rest';
import { decode } from 'js-base64';

import { Branch, Repository, SettingsOverrides } from '../models';

export interface ISourceControlClient {
  getRepository(owner: string, repositoryName: string): Promise<Repository>;

  findRepositories(organization: string): Promise<{ name: string; owner: string; id: string }[]>;

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

    const topics = await this.octokit.repos.getAllTopics({
      owner: owner,
      repo: repositoryName,
    });
    const listBranchesResponse = await this.octokit.repos.listBranches({
      repo: repo.data.name,
      owner: owner,
    });

    const settingsFile = await this.getPipelineFactorySettings(owner, repositoryName, repo.data.default_branch);

    return {
      name: repo.data.name,
      owner: owner,
      defaultBranch: repo.data.default_branch,
      repositoryId: repo.data.id.toString(),
      topics: topics.data.names,
      branches: listBranchesResponse.data.map((branch) => {
        return new Branch(branch.name, branch.commit.sha);
      }),
      settings: settingsFile,
    };
  }

  public async findRepositories(organization: string): Promise<{ name: string; owner: string; id: string }[]> {
    const repos = await this.octokit.paginate(this.octokit.repos.listForOrg, {
      org: organization,
    });

    return repos
      .filter((r) => true || r.name.startsWith('stage'))
      .map((r) => {
        return {
          name: r.name,
          owner: r.owner?.login || organization,
          id: r.id.toString(),
        };
      });
  }

  public async fetchFile(owner: string, repo: string, branchName: string, filePath: string): Promise<string | null> {
    let settingsFileContent;
    const settingsFileResponse = await this.octokit.repos.getContent({
      owner: owner,
      repo: repo,
      ref: branchName,
      path: filePath,
    });
    if (settingsFileResponse.status == 200) {
      settingsFileContent = decode((settingsFileResponse.data as any).content);
      return settingsFileContent;
    } else {
      return null;
    }
  }

  public async getCommitInfo(
    owner: string,
    repo: string,
    commit_sha: string,
  ): Promise<{ author: string; message: string; url: string; date: string }> {
    const commitInfo = await this.octokit.git.getCommit({
      owner: owner,
      repo: repo,
      commit_sha: commit_sha,
    });
    return {
      author: commitInfo.data.author.name,
      message: commitInfo.data.message,
      url: commitInfo.data['html_url'],
      date: commitInfo.data.author.date,
    };
  }

  public async getPipelineFactorySettings(
    owner: string,
    repositoryName: string,
    branchName: string,
  ): Promise<SettingsOverrides> {
    const settingsFileContent = await this.fetchFile(owner, repositoryName, branchName, 'pipeline-factory.settings');
    const settingsFileJSON: SettingsOverrides = settingsFileContent ? JSON.parse(settingsFileContent) : {};
    return settingsFileJSON;
  }
}
