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
    const pipeLineExecutionResponse = await this.awsClient.getPipelineExecution(pipeline, executionId);
    const artifactRevision = pipeLineExecutionResponse.pipelineExecution.artifactRevisions[0];

    console.log(`Artifact revision: ${JSON.stringify(artifactRevision)}`);
    const repositoryName = NotificationsPayloadBuilder.getRepoFromArtifactRevision(artifactRevision);
    const organizationName = 'stage-tech';
    const repo = await this.githubClient.getRepository(organizationName, repositoryName);

    const commitBranch = await this.githubClient.getCommitBranch('stage-tech', repo.name, artifactRevision.revisionId);

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

    if (!notificationTargets.length) {
      throw Error(
        `No applicable notifications configurations found: ${JSON.stringify(
          notificationTargets,
        )} commit branch: ${JSON.stringify(commitBranch)} factorySettings: ${JSON.stringify(factorySettings)}`,
      );
    }
    return notificationTargets;
  };
}
