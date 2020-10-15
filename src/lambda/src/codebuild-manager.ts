import AWS from 'aws-sdk';

import { PipelineProperties } from './pipeline-properties-builder';

export interface PipeLineCreationResult {
  message: string;
  buildArn?: string;
}

export class PipelineManager {
  async createPipeLine(buildParameters: PipelineProperties): Promise<PipeLineCreationResult> {
    const params: AWS.CodeBuild.StartBuildInput = {
      projectName: buildParameters.projectName,
      environmentVariablesOverride: [
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
        {
          name: 'BUILD_SPEC_RELATIVE_LOCATION',
          value: buildParameters.buildSpecLocation,
          type: 'PLAINTEXT',
        },
        {
          name: 'ARTIFACTS_BUCKET',
          value: buildParameters.artifactsBucketName,
          type: 'PLAINTEXT',
        },
        {
          name: 'GITHUB_TOKEN_SECRETNAME',
          value: buildParameters.gitHubTokenSecretName,
          type: 'PLAINTEXT',
        },
        {
          name: 'ARTIFACTS_PREFIX',
          value: buildParameters.artifactsPrefix,
          type: 'PLAINTEXT',
        },
        {
          name: 'TRANSIENT_ARTIFACTS_BUCKET_NAME',
          value: buildParameters.transientArtifactsBucket,
          type: 'PLAINTEXT',
        },
        {
          name: 'BUILD_AS_ROLE_ARN',
          value: buildParameters.buildAsRoleArn,
          type: 'PLAINTEXT',
        },
        {
          name: 'SLACK_WORKSPACE_ID',
          value: buildParameters.slackWorkspaceId,
          type: 'PLAINTEXT',
        },
        {
          name: 'SLACK_CHANNEL_NAME_PREFIX',
          value: buildParameters.slackChannelNamePrefix,
          type: 'PLAINTEXT',
        },
      ],
    };

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
        message: `This branch is not configured for monitoring  , configured branches are ${JSON.stringify(
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
    const isMonitoredBranch = monitoredBranches.includes(buildParameters.branchName);
    return isMonitoredBranch;
  }
}
