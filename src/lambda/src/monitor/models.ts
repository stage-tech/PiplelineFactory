export class Repository {
  constructor(public owner: string, public name: string, public defaultBranch: string) {}
}

export class RepositoryBuildConfiguration {
  constructor(
    public repository: Repository,
    private branches: Branch[],
    private configuredBranches: string[],
    private settings?: any,
  ) {}

  requestedBranches(): Branch[] {
    const monitoredBySettingsFile: string[] = this.settings?.monitoredBranches || [];
    monitoredBySettingsFile.push(this.repository.defaultBranch);
    const requested = (branchName: string) => {
      return monitoredBySettingsFile.map((b) => b.toLowerCase()).indexOf(branchName.toLowerCase()) >= 0;
    };

    return this.branches?.filter((b) => requested(b.branchName));
  }

  newMonitoredBranches(): Branch[] {
    const alreadyMonitored = (b: string) => {
      return this.configuredBranches.map((b) => b.toLowerCase()).indexOf(b.toLowerCase()) >= 0;
    };
    return this.requestedBranches().filter((b) => !alreadyMonitored(b.branchName));
  }

  obsoletePipelines(): string[] {
    const requested = (b: string) => {
      return (
        this.requestedBranches()
          .map((b) => b.branchName.toLowerCase())
          .indexOf(b.toLowerCase()) >= 0
      );
    };

    const removedBranches = this.configuredBranches.filter(
      (existingPipeline) =>
        !this.requestedBranches().find((branch) => existingPipeline.toLowerCase() == branch.branchName.toLowerCase()),
    );

    return removedBranches;
  }
}

export class Branch {
  constructor(public branchName: string, public commitSha: string) {}
}
