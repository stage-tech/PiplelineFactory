import { AWSClient } from '../clients/aws-client';
import { GithubClient } from '../clients/github-client';
import { NotificationSettings } from '../models';
import { NotificationsPayloadBuilder } from './notifications-payload-builder';

export class NotificationTargetsManager {
  private awsClient: AWSClient;
  private githubClient: GithubClient;

  constructor(awsClient: AWSClient, githubClient: GithubClient) {
    this.awsClient = awsClient;
    this.githubClient = githubClient;
  }

  public getRequiredNotificationTargets = async (
    pipeline: string,
    executionId: string,
    eventState: string,
  ): Promise<NotificationSettings[]> => {
    try {
      const pipeLineExecutionResponse = await this.awsClient.getPipelineExecution(pipeline, executionId);
      console.log(`PLE response: ${JSON.stringify(pipeLineExecutionResponse)}`);
      const artifactRevision = pipeLineExecutionResponse.pipelineExecution.artifactRevisions[0];

      console.log(`Artifact revision: ${JSON.stringify(artifactRevision)}`);
      const repositoryName = NotificationsPayloadBuilder.getRepoFromArtifactRevision(artifactRevision);
      const organizationName = NotificationsPayloadBuilder.getOrganizationNameFromArtifactRevision(artifactRevision);
      const repo = await this.githubClient.getRepository(organizationName, repositoryName);

      const commitBranch = await this.githubClient.getCommitBranch(
        organizationName,
        repo.name,
        artifactRevision.revisionId,
      );

      if (!commitBranch || commitBranch.data?.length < 1) {
        throw Error('No commit branch was received');
      }

      const factorySettings = repo.settings;
      if (!factorySettings?.notifications) {
        throw Error(`No notifications configuration found for ${repo.name}`);
      }

      const notificationTargets = factorySettings.notifications.filter((setting) => {
        return setting.event === eventState && setting.branches.includes(commitBranch.data[0].name);
      });
      console.log(`Information for debuging: ${commitBranch}\n${factorySettings}`);
      return notificationTargets;
    } catch (error) {
      console.log(`Error while retrieving notification targets ${error}`);
      throw error;
    }
  };
}
