export class Repository {
  name: string;
  owner: string;
}

export class RepositoryBuildConfiguration extends Repository {
  constructor(repo: Repository) {
    super();
    this.name = repo.name;
    this.owner = repo.owner;
  }
  branches?: Branch[];
  monitoredBranches(): Branch[] {
    return this.branches?.filter((b) => b.isMonitoredBranch) || [];
  }
}

export class Branch {
  branchName: string;
  commitSha: string;
  repository: Repository;
  settings?: any;
  isMonitoredBranch: boolean;
}
