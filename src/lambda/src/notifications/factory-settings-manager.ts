import { AWSClient } from '../clients/aws-client';
import { GithubClient } from '../clients/github-client';
import { NotificationSettings } from '../models';
import { NotificationsManager } from './notifications-manager';

export class FactorySettingsManager {
  private awsClient: AWSClient;
  private githubClient: GithubClient;

  constructor(awsClient: AWSClient, githubClient: GithubClient) {
    this.awsClient = awsClient;
    this.githubClient = githubClient;
  }

  public getApplicableSettings = async (
    pipeline: string,
    executionId: string,
    eventState: string,
  ): Promise<NotificationSettings[]> => {
    const artifactRevision = (await this.awsClient.getPipelineExecution(pipeline, executionId)).pipelineExecution
      .artifactRevisions[0];

    console.log(`Artifact revision: ${JSON.stringify(artifactRevision)}`);
    const repo = await this.githubClient.getRepository(
      'stage-tech',
      NotificationsManager.getRepoFromArtifactRevision(artifactRevision),
    );

    const commitBranch = await this.githubClient.getCommitBranch('stage-tech', repo.name, artifactRevision.revisionId);

    if (!commitBranch) {
      throw Error('No commit branch was received');
    }

    const factorySettings = await this.githubClient.getPipelineFactorySettings(
      'stage-tech',
      repo.name,
      commitBranch.data[0].name,
    );

    if (!factorySettings.notifications) {
      throw Error(`No notifications configuriation found for ${repo.name}`);
    }

    const applicableSettings = factorySettings.notifications.filter((setting) => {
      return setting.event === eventState && setting.branches.includes(commitBranch.data[0].name);
    });

    if (!applicableSettings.length) {
      throw Error(
        `No applicable notifications configurations found: ${JSON.stringify(
          applicableSettings,
        )} commit branch: ${JSON.stringify(commitBranch)} factorySettings: ${JSON.stringify(factorySettings)}`,
      );
    }
    return applicableSettings;
  };
}
