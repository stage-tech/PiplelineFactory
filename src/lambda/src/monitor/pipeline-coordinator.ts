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
        console.log(`creating ${JSON.stringify(branch, null, 4)}`);

        return await this.cloudFormationManager.createPipeline(buildConfigurations, branch.branchName);
      }),
    );
  }

  async cleanObsoletePipelines(buildConfigurations: RepositoryBuildConfiguration) {
    buildConfigurations.obsoletePipelines().map((branch) => {
      console.log(`deleting ${JSON.stringify(branch, null, 4)}`);

      return this.cloudFormationManager.deletePipeLineStack(
        buildConfigurations.repository.owner,
        buildConfigurations.repository.name,
        branch.branchName,
      );
    });
  }
}
