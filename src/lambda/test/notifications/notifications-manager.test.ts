import { anything, instance, mock, when } from 'ts-mockito';

import { AWSDevToolsClient } from '../../src/clients/aws-dev-tools-client';
import { GithubClient } from '../../src/clients/github-client';
import { NotificationsPayloadBuilder } from '../../src/notifications/notifications-payload-builder';

const required = <T>(input: T | undefined | null | void) => {
  if (input === null || input === undefined) {
    throw new Error('Field is required and should never be null, undefined or void');
  }
  return input;
};

describe('NotificationsManager tests', () => {
  const awsClientMock = mock(AWSDevToolsClient);
  const gitHubClientMock = mock(GithubClient);

  it('get failure reason from codebuild', async () => {
    when(awsClientMock.getPipelineSourceConfigurations(anything())).thenResolve({
      branch: 'some_branch',
      owner: 'some_owner',
      repository: 'some_repository',
    });
    when(awsClientMock.getPipelineExecution(anything(), anything())).thenResolve({
      artifactRevisions: [
        {
          created: undefined,
          name: 'SourceCode',
          revisionChangeIdentifier: undefined,
          revisionId: '4821350e17367a593b9ee660151c9f3631e2ce92',
          revisionSummary: 'Merge pull request #177 from stage-tech/SPX-973',
          revisionUrl:
            'https://github.com/stage-tech/stage-door-datasync-execution-lambda/commit/4821350e17367a593b9ee660151c9f3631e2ce92',
        },
      ],
      pipelineExecutionId: '42bb849b-c35c-4548-b0b7-767921c4e6c9',
      pipelineName: 'stage-door-datasync-execution-lambda-master',
      pipelineVersion: 1,
      status: 'Failed',
      statusSummary: undefined,
    });
    when(awsClientMock.getFailedAction(anything(), anything())).thenResolve({
      actionExecutionId: 'f9e6d5e2-0472-4044-b498-c36b29b78b2a',
      actionName: 'RunBuildSpec',
      input: {},
      lastUpdateTime: new Date('2021-05-31T07:04:13.099Z'),
      output: {
        executionResult: {
          externalExecutionId: 'testExecutionId',
          externalExecutionUrl: 'some_url',
          externalExecutionSummary: 'some_summary',
        },
      },
      pipelineExecutionId: '42bb849b-c35c-4548-b0b7-767921c4e6c9',
      pipelineVersion: 1,
      stageName: 'Build',
      startTime: new Date('2021-05-31T07:04:13.099Z'),
      status: 'Failed',
    });
    const notificationsManager = new NotificationsPayloadBuilder(instance(awsClientMock), gitHubClientMock);
    const payload = await notificationsManager.buildNotificationPayload({
      executionId: 'executionId',
      pipelineName: '',
    });
    expect(payload.failureLogs).toBe('some_url');
    expect(payload.failureSummary).toBe('some_summary');
  });

  it('populates github commit details', async () => {
    when(awsClientMock.getPipelineSourceConfigurations(anything())).thenResolve({
      branch: 'some_branch',
      owner: 'some_owner',
      repository: 'some_repository',
    });
    when(awsClientMock.getPipelineExecution(anything(), anything())).thenResolve({
      artifactRevisions: [
        {
          created: undefined,
          name: 'SourceCode',
          revisionChangeIdentifier: undefined,
          revisionId: '4821350e17367a593b9ee660151c9f3631e2ce92',
          revisionSummary: 'Merge pull request #177 from stage-tech/SPX-973',
          revisionUrl:
            'https://github.com/stage-tech/stage-door-datasync-execution-lambda/commit/4821350e17367a593b9ee660151c9f3631e2ce92',
        },
      ],
      pipelineExecutionId: '42bb849b-c35c-4548-b0b7-767921c4e6c9',
      pipelineName: 'stage-door-datasync-execution-lambda-master',
      pipelineVersion: 1,
      status: 'Failed',
      statusSummary: undefined,
    });
    const gitHubMock = mock(GithubClient);
    when(gitHubMock.getCommitInfo(anything(), anything(), anything())).thenResolve({
      author: 'some_author',
      date: 'some_date',
      message: 'some_message',
      url: 'some_url',
    });
    const notificationsManager = new NotificationsPayloadBuilder(instance(awsClientMock), instance(gitHubMock));
    const payload = await notificationsManager.buildNotificationPayload({
      executionId: 'executionId',
      pipelineName: '',
    });
    expect(payload.commitAuthor).toBe('some_author');
    expect(payload.commitDate).toBe('some_date');
    expect(payload.commitMessage).toBe('some_message');
    expect(payload.commitUrl).toBe('some_url');
  });
});
