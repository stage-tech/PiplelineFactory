import { CloudFormationManager } from './cloudformation-manager';
import { RepositoryBuildConfiguration } from './models';

export class PipelineCoordinator {
  constructor(private cloudFormationManager: CloudFormationManager) {}

  async createNewPipelines(buildConfigurations: RepositoryBuildConfiguration) {
    if (!buildConfigurations.shouldBeMonitored()) {
      console.log('repository is not configured for monitoring , skipping');
      return;
    }

    const newBranches = buildConfigurations.branchesToAdd();
    await Promise.all(
      newBranches.map(async (branch) => {
        return await this.cloudFormationManager.createPipeline(buildConfigurations, branch.branchName);
      }),
    );
  }

  async cleanObsoletePipelines(buildConfigurations: RepositoryBuildConfiguration) {
    buildConfigurations.obsoletePipelines().map((branch) => {
      return this.cloudFormationManager.deletePipeLineStack(
        buildConfigurations.repository.owner,
        buildConfigurations.repository.name,
        branch.branchName,
      );
    });
  }
}
