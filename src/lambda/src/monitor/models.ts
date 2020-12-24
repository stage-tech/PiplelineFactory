import { StackInformation } from './cloudformation-manager';

export class DiscoveryJob {
  repositoryName: string;
  owner: string;
  id: string;
}
export class Branch {
  constructor(public branchName: string, public commitSha: string) {}
  public pipelineStack: StackInformation;
}

export class Repository {
  name: string;
  owner: string;
  id: string;
  defaultBranch: string;
  topics: string[];
  repositoryId: string;
  branches: Branch[];
  settings: any;
}

export class RepositoryBuildConfiguration {
  constructor(public repository: Repository, private configuredBranches: string[]) {}

  requestedBranches(): Branch[] {
    const monitoredBySettingsFile: string[] = this.repository.settings?.monitoredBranches || [];
    monitoredBySettingsFile.push(this.repository.defaultBranch);
    const allRequestedBranchNames = monitoredBySettingsFile.map((b) => b.toLowerCase());
    return this.repository.branches.filter((b) =>
      allRequestedBranchNames.find((br) => br == b.branchName.toLowerCase()),
    );
  }

  private isRequestedForMonitoring(branchName: string): boolean {
    const result =
      this.requestedBranches().findIndex((b) => b.branchName.toLowerCase() == branchName.toLocaleLowerCase()) > -1;
    return result;
  }

  private isNew(branchName: string): boolean {
    const result = this.configuredBranches.findIndex((b) => b.toLowerCase() == branchName.toLocaleLowerCase()) == -1;
    return result;
  }

  private isAlreadyMonitored(branchName: string): boolean {
    const result = this.configuredBranches.findIndex((b) => b.toLowerCase() == branchName.toLocaleLowerCase()) > -1;
    return result;
  }

  newMonitoredBranches(): Branch[] {
    const newRequestedBranches: Branch[] = [];

    this.repository.branches.forEach((branch) => {
      if (this.isRequestedForMonitoring(branch.branchName) && this.isNew(branch.branchName)) {
        newRequestedBranches.push(branch);
      }
    });
    return newRequestedBranches;
  }

  obsoletePipelines(): Branch[] {
    const obsoleteBranches: Branch[] = [];

    this.repository.branches.forEach((branch) => {
      if (!this.isRequestedForMonitoring(branch.branchName) && this.isAlreadyMonitored(branch.branchName)) {
        obsoleteBranches.push(branch);
      }
    });

    return obsoleteBranches;
  }
}
