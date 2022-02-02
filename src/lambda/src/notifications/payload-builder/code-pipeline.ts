import { AWSDevToolsClient } from '../../clients/aws-dev-tools-client';
import { GithubClient } from '../../clients/github-client';
import { NotificationPayload, PipelineEventDetail } from '../../models';
import { INotificationsPayloadBuilder } from './interface';

export class CodeBuildNotificationsPayloadBuilder implements INotificationsPayloadBuilder {
  constructor(
    private awsClient: AWSDevToolsClient,
    private gitHubClient: GithubClient,
    private event: PipelineEventDetail,
  ) {}

  async buildNotificationPayload(): Promise<NotificationPayload> {
    const pipelineExecution = await this.awsClient.getPipelineExecution(this.event.name, this.event.executionId);
    const githubConfigs = await this.awsClient.getBuildSourceConfigurations(this.event.name);
    const artifactRevision = pipelineExecution.artifactRevisions ? pipelineExecution?.artifactRevisions[0] : undefined;
    if (!artifactRevision?.revisionId) {
      throw new Error('cannot get version information');
    }

    const commitInfo = await this.gitHubClient.getCommitInfo(
      githubConfigs.owner,
      githubConfigs.repository,
      artifactRevision.revisionId,
    );

    let failureDetails: { link?: string; summary?: string; step?: string } | undefined;
    if (pipelineExecution.status?.toUpperCase() == 'FAILED') {
      const failedExecution = await this.awsClient.getFailedAction(this.event.name, this.event.executionId);
      failureDetails = {
        link: failedExecution?.output?.executionResult?.externalExecutionUrl,
        summary: failedExecution?.output?.executionResult?.externalExecutionSummary,
        step: failedExecution?.actionName,
      };
    }
    return {
      name: this.event.name,
      state: pipelineExecution.status?.toUpperCase() || '',
      executionId: this.event.executionId,
      commitUrl: commitInfo.url || '',
      commitMessage: commitInfo.message || '',
      commitAuthor: commitInfo.author || '',
      commitDate: commitInfo.date || '',
      failureLogs: failureDetails?.link,
      failureSummary: failureDetails?.summary,
      failurePhase: failureDetails?.step,
      codeInformation: githubConfigs,
    };
  }
}
