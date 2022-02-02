import { AWSDevToolsClient } from '../../clients/aws-dev-tools-client';
import { GithubClient } from '../../clients/github-client';
import { NotificationPayload, PipelineEventDetail } from '../../models';
import { INotificationsPayloadBuilder } from './interface';

export class CodePipelineNotificationsPayloadBuilder implements INotificationsPayloadBuilder {
  constructor(
    private awsClient: AWSDevToolsClient,
    private gitHubClient: GithubClient,
    private event: PipelineEventDetail,
  ) {}

  async buildNotificationPayload(): Promise<NotificationPayload> {
    const githubConfigs = await this.awsClient.getBuildSourceConfigurations(this.event.executionId);

    const commitInfo = await this.gitHubClient.getCommitInfo(
      githubConfigs.owner,
      githubConfigs.repository,
      githubConfigs.commitSha,
    );

    let failureDetails: { link?: string; summary?: string; step?: string } | undefined;

    return {
      name: this.event.name,
      state: this.event.state.toUpperCase() || '',
      executionId: this.event.executionId,
      commitUrl: commitInfo.url || '',
      commitMessage: commitInfo.message || '',
      commitAuthor: commitInfo.author || '',
      commitDate: commitInfo.date || '',
      failureLogs: this.event.link,
      failureSummary: failureDetails?.summary,
      failurePhase: this.event.phase,
      codeInformation: githubConfigs,
    };
  }
}
