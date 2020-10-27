import { Octokit } from '@octokit/rest';
import { decode } from 'js-base64';

import { Branch, Repository } from './models';

export interface ISourceControlClient {
  findBranches(owner: string, repositoryName: string): Promise<Branch[]>;

  findSubscribedRepositories(organization: string): Promise<Repository[]>;

  getPipelineFactorySettings(repo: Branch): Promise<any>;

  fetchFile(owner: string, repo: string, branchName: string, filePath: string): Promise<string | null>;
}

export class GithubClient implements ISourceControlClient {
  private octokit: Octokit;
  constructor(token: string) {
    this.octokit = new Octokit({
      auth: token,
    });
  }

  public async findSubscribedRepositories(organization: string): Promise<Repository[]> {
    const repos = await this.octokit.paginate(this.octokit.repos.listForOrg, {
      org: organization,
    });

    return repos
      .filter((r) => r.name.startsWith('stage'))
      .map((r) => {
        return {
          name: r.name,
          owner: r.owner.login,
        };
      });
  }

  public async findBranches(owner: string, repositoryName: string): Promise<Branch[]> {
    const listBranchesResponse = await this.octokit.repos.listBranches({
      repo: repositoryName,
      owner: owner,
    });

    return (
      listBranchesResponse.data
        //   .filter((b) => b.name == 'master' || b.name == 'abdo')
        .map((branch) => {
          const b: Branch = {
            branchName: branch.name,
            commitSha: branch.commit.sha,
            repository: {
              name: repositoryName,
              owner: owner,
            },
            isMonitoredBranch: false,
          };
          return b;
        })
    );
  }

  public async getPipelineFactorySettings(branch: Branch): Promise<any> {
    const settingsFileContent: any = await this.fetchFile(
      branch.repository.owner,
      branch.repository.name,
      branch.branchName,
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
