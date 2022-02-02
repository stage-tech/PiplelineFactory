import { anything, instance, mock, when } from 'ts-mockito';
import { CodePipelineNotificationsPayloadBuilder } from '../../src/notifications/payload-builder/code-pipeline';
import { AWSDevToolsClient } from '../../src/clients/aws-dev-tools-client';
import { GithubClient } from '../../src/clients/github-client';
import { BuildEventSource } from '../../src/models';
describe('Notification Payload Builder', () => {
  const awsClientMock = mock(AWSDevToolsClient);
  const gitHubClientMock = mock(GithubClient);

  it('get failure data from codebuild', async () => {
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
    const event = {
      executionId: 'executionId',
      name: '',
      source: BuildEventSource.AWS_CODE_PIPELINE,
    };
    const notificationsManager = new CodePipelineNotificationsPayloadBuilder(
      instance(awsClientMock),
      gitHubClientMock,
      event,
    );

    const payload = await notificationsManager.buildNotificationPayload();
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
    const notificationsManager = new CodePipelineNotificationsPayloadBuilder(
      instance(awsClientMock),
      instance(gitHubMock),
      {
        executionId: 'executionId',
        name: '',
      },
    );
    const payload = await notificationsManager.buildNotificationPayload();
    expect(payload.commitAuthor).toBe('some_author');
    expect(payload.commitDate).toBe('some_date');
    expect(payload.commitMessage).toBe('some_message');
    expect(payload.commitUrl).toBe('some_url');
  });
});
