import AWS from 'aws-sdk';

import { PipelineProperties } from './pipeline-properties-builder';

export interface PipeLineCreationResult {
  message: string;
  buildArn?: string;
}

export class PipelineManager {
  async deletePipeLine(buildParameters: PipelineProperties): Promise<PipeLineCreationResult> {
    const stack = await this.findPipelineStack(
      buildParameters.repository_owner,
      buildParameters.repository_name,
      buildParameters.branchName,
    );
    if (stack) {
      console.log(`deleting stack ${stack.StackName}`);
      //  const deletionResult = await cloudFormationClient.deleteStack({ StackName: stack.StackName }).promise();
      // console.log(JSON.stringify(deletionResult.$response.data));

      console.log(JSON.stringify('deletion commented out'));
      return {
        message: `deleted pipeline with cloudformation stack name ${stack.StackName}`,
      };
    } else {
      return {
        message: `no matching stack found for
         ${buildParameters.repository_owner}/${buildParameters.repository_name} 
        and branch ${buildParameters.branchName}`,
      };
    }
  }

  public async findPipelineStack(repositoryOwner: string, repositoryName: string, branchName: string) {
    const cloudFormationClient = new AWS.CloudFormation();
    const result = await cloudFormationClient.describeStacks({}).promise();
    const matchingStacks = result.Stacks?.filter(
      (s) =>
        s.Tags?.find((t) => t.Key == 'repository' && t.Value == `${repositoryOwner}/${repositoryName}`) &&
        s.Tags.find((t) => t.Key == 'service' && t.Value == `pipeline-factory`) &&
        s.Tags.find((t) => t.Key == 'branch' && t.Value == `${branchName}`),
    );

    const stack = matchingStacks ? matchingStacks[0] : null;
    return stack;
  }

  async createPipeLine(buildParameters: PipelineProperties): Promise<PipeLineCreationResult> {
    const environmentOverRides = [
      {
        name: 'GITHUB_REPOSITORY_NAME',
        value: buildParameters.repository_name,
        type: 'PLAINTEXT',
      },
      {
        name: 'GITHUB_REPOSITORY_BRANCH',
        value: buildParameters.branchName,
        type: 'PLAINTEXT',
      },
      {
        name: 'GITHUB_REPOSITORY_OWNER',
        value: buildParameters.repository_owner,
        type: 'PLAINTEXT',
      },
    ];

    if (buildParameters.gitHubTokenSecretArn) {
      environmentOverRides.push({
        name: 'GITHUB_TOKEN_SECRET_ARN',
        value: buildParameters.gitHubTokenSecretArn,
        type: 'PLAINTEXT',
      });
    }
    if (buildParameters.buildSpecLocation) {
      environmentOverRides.push({
        name: 'BUILD_SPEC_RELATIVE_LOCATION',
        value: buildParameters.buildSpecLocation,
        type: 'PLAINTEXT',
      });
    }

    if (buildParameters.artifactsBucketName) {
      environmentOverRides.push({
        name: 'ARTIFACTS_BUCKET',
        value: buildParameters.artifactsBucketName,
        type: 'PLAINTEXT',
      });
    }

    if (buildParameters.buildAsRoleArn) {
      environmentOverRides.push({
        name: 'BUILD_AS_ROLE_ARN',
        value: buildParameters.buildAsRoleArn,
        type: 'PLAINTEXT',
      });
    }

    const params: AWS.CodeBuild.StartBuildInput = {
      projectName: buildParameters.factoryCodeBuildProjectName,
      environmentVariablesOverride: environmentOverRides,
    };

    console.log(JSON.stringify(params));
    const isMonitoredBranch = this.isMonitoredBranch(buildParameters);

    if (isMonitoredBranch) {
      console.debug(`branch name is configured for monitoring`);
    } else {
      console.debug(
        `Skipping , branch name is not configured for monitoring , configured branches are ${JSON.stringify(
          buildParameters.monitoredBranches,
        )}`,
      );
      return {
        message: `This branch ${
          buildParameters.branchName
        } is not configured for monitoring  , configured branches are ${JSON.stringify(
          buildParameters.monitoredBranches,
        )}`,
      };
    }

    //return;
    const codebuild = new AWS.CodeBuild({ apiVersion: '2016-10-06' });
    const buildResult = await codebuild.startBuild(params).promise();

    if (buildResult.$response.error) {
      return {
        message: buildResult.$response.error.message,
      };
    }

    return {
      message: 'Pipeline Creation Started',
      buildArn: buildResult.build?.arn,
    };
  }

  private isMonitoredBranch(buildParameters: PipelineProperties) {
    const monitoredBranches = Array.isArray(buildParameters.monitoredBranches) ? buildParameters.monitoredBranches : [];
    monitoredBranches.push('master');
    const isMonitoredBranch = monitoredBranches
      .map((b) => b.toLowerCase())
      .includes(buildParameters.branchName.toLowerCase());
    return isMonitoredBranch;
  }
}
