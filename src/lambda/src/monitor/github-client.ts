import { Octokit } from '@octokit/rest';
import { decode } from 'js-base64';

export class Repository {
  name: string;
  owner: string;
  branches?: BranchConfigurations[];
}

export class BranchConfigurations {
  branchName: string;
  settingsFile: any;
}

export interface ISvcClient {
  findSubscribedRepositories(organization: string): Promise<Repository[]>;

  getPipelineConfigurations(repo: Repository): Promise<BranchConfigurations[]>;
}

export class GithubClient implements ISvcClient {
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

  async getPipelineConfigurations(repo: Repository): Promise<BranchConfigurations[]> {
    const branches = await this.octokit.repos.listBranches({
      repo: repo.name,
      owner: repo.owner,
    });

    return Promise.all(
      branches.data.map(async (branch) => {
        const settingsFileJSON: any = await this.getRepositorySettings(repo.owner, repo.name, branch.name);
        const pipelineInfo: BranchConfigurations = {
          branchName: branch.name,
          settingsFile: settingsFileJSON,
        };

        return pipelineInfo;
      }),
    );
  }

  private async getRepositorySettings(owner: string, repo: string, branchName: string) {
    let settingsFileContent;
    return await this.octokit.repos
      .getContent({
        owner: owner,
        repo: repo,
        ref: branchName,
        path: 'pipeline-factory.settings',
      })
      .then((settingsFileResponse) => {
        if (settingsFileResponse.status == 200) {
          settingsFileContent = decode(settingsFileResponse.data.content);
          return JSON.parse(settingsFileContent);
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
