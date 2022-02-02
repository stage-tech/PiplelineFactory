import { link } from 'fs';
import { AWSDevToolsClient } from '../../clients/aws-dev-tools-client';
import { GithubClient } from '../../clients/github-client';
import { NotificationPayload, PipelineEventDetail } from '../../models';
import { INotificationsPayloadBuilder } from './interface';

export class CodeBuildPayloadBuilder implements INotificationsPayloadBuilder {
  constructor(
    private awsClient: AWSDevToolsClient,
    private gitHubClient: GithubClient,
    private event: PipelineEventDetail,
  ) {}

  async buildNotificationPayload(): Promise<NotificationPayload> {
    const environmentVariables = this.event.sourceEvent.detail['additional-information'].environment['environment-variables'] as any[];
    if (!environmentVariables) {
      throw new Error('Cannot find environment variables on source event');
    }

    const repository = environmentVariables.find(variable => variable.name === 'GITHUB_REPOSITORY').value as string;

    const githubConfigs = {
      owner: repository.split('/')[0],
      repository: repository.split('/')[0],
      branch: environmentVariables.find(variable => variable.name === 'GITHUB_REPOSITORY_BRANCH').value as string,
      commitSha: this.event.sourceEvent.detail['additional-information']['source-version'] as string
    };

    const commitInfo = await this.gitHubClient.getCommitInfo(
      githubConfigs.owner,
      githubConfigs.repository,
      githubConfigs.commitSha,
    );

    let failureDetails: { link?: string; summary?: string; step?: string } | undefined;
    if(this.event.state.toUpperCase() === 'FAILED') {
      const phases = this.event.sourceEvent.detail['additional-information'].phases as any[];
      const failedPhase = phases.find(phase => phase['phase-status'] === 'FAILED');
      failureDetails = {
        step: failedPhase['phase-type'] as string,
        summary: failedPhase['phase-context'] as string,
        link: this.event.sourceEvent.detail['additional-information'].logs['deep-link'] as string,
      }
    }

    return {
      name: this.event.name,
      state: this.event.state.toUpperCase() || '',
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
