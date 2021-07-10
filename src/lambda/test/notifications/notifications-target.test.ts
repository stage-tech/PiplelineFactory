import { equal } from 'assert/strict';
import exp from 'constants';
import { anything, instance, mock, verify, when } from 'ts-mockito';

import { AWSDevToolsClient } from '../../src/clients/aws-dev-tools-client';
import { GithubClient } from '../../src/clients/github-client';
import { ChannelType, PipelineState } from '../../src/models';
import { NotificationTargetsManager } from '../../src/notifications/notification-targets-manager';

describe('Notification Targets Manager', () => {
  const awsClientMock = mock(AWSDevToolsClient);
  const gitHubClientMock = mock(GithubClient);

  it('fetches setting from github', async () => {
    when(awsClientMock.getPipelineSourceConfigurations(anything())).thenResolve({
      branch: 'some_branch',
      owner: 'some_owner',
      repository: 'some_repository',
    });

    when(gitHubClientMock.getRepository(anything(), anything())).thenResolve({
      branches: [],
      defaultBranch: 'dev',
      name: 'myRepo',
      owner: 'myOrg',
      repositoryId: 'myId',
      settings: { monitoredBranches: ['new1', 'new2', 'existinG2', 'exisTing1'] },
      topics: ['topic1'],
    });
    const targetsManager = new NotificationTargetsManager(instance(awsClientMock), instance(gitHubClientMock));
    const payload = await targetsManager.getNotificationTargets('some_pipeline', 'FAILED');
    verify(gitHubClientMock.getRepository('some_owner', 'some_repository')).once();
  });

  it('resolve targets on single and multiple branches', async () => {
    when(awsClientMock.getPipelineSourceConfigurations(anything())).thenResolve({
      branch: 'master',
      owner: 'some_owner',
      repository: 'some_repository',
    });

    when(gitHubClientMock.getRepository(anything(), anything())).thenResolve({
      branches: [],
      defaultBranch: 'dev',
      name: 'myRepo',
      owner: 'myOrg',
      repositoryId: 'myId',
      settings: {
        notifications: [
          {
            branches: ['master'],
            event: PipelineState.FAILED,
            channelType: ChannelType.SLACK,
            channelId: 'master-problems',
          },
          {
            branches: ['master'],
            event: PipelineState.FAILED,
            channelType: ChannelType.SLACK,
            channelId: 'master-problems',
          },
          {
            branches: ['feature'],
            event: PipelineState.FAILED,
            channelType: ChannelType.SLACK,
            channelId: 'feature-problems',
          },
          {
            branches: ['feature', 'master'],
            event: PipelineState.FAILED,
            channelType: ChannelType.SLACK,
            channelId: 'global-problems',
          },
          {
            branches: ['master'],
            event: PipelineState.SUCCEEDED,
            channelType: ChannelType.SLACK,
            channelId: 'master-success',
          },
          {
            branches: ['feature'],
            event: PipelineState.FAILED,
            channelType: ChannelType.SLACK,
            channelId: 'feature-problems',
          },
        ],
      },
      topics: [],
    });
    const targetsManager = new NotificationTargetsManager(instance(awsClientMock), instance(gitHubClientMock));
    const targets = await targetsManager.getNotificationTargets('some_pipeline', 'FAILED');

    expect(targets).toContainEqual({
      channelType: ChannelType.SLACK,
      channelId: 'master-problems',
    });

    expect(targets).toContainEqual({
      channelType: ChannelType.SLACK,
      channelId: 'global-problems',
    });
  });

  it('return only distinct targets', async () => {
    when(awsClientMock.getPipelineSourceConfigurations(anything())).thenResolve({
      branch: 'master',
      owner: 'some_owner',
      repository: 'some_repository',
    });

    when(gitHubClientMock.getRepository(anything(), anything())).thenResolve({
      branches: [],
      defaultBranch: 'dev',
      name: 'myRepo',
      owner: 'myOrg',
      repositoryId: 'myId',
      settings: {
        notifications: [
          {
            branches: ['master'],
            event: PipelineState.FAILED,
            channelType: ChannelType.SLACK,
            channelId: 'master-problems',
          },
          {
            branches: ['master', 'feature'],
            event: PipelineState.FAILED,
            channelType: ChannelType.SLACK,
            channelId: 'master-problems',
          },
        ],
      },
      topics: [],
    });
    const targetsManager = new NotificationTargetsManager(instance(awsClientMock), instance(gitHubClientMock));
    const targets = await targetsManager.getNotificationTargets('some_pipeline', 'FAILED');

    expect(targets).toHaveLength(1);
    expect(targets).toContainEqual({
      channelType: ChannelType.SLACK,
      channelId: 'master-problems',
    });
  });
});
