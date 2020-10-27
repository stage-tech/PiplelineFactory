import { anyOfClass, anyString, anything, capture, instance, mock, verify, when } from 'ts-mockito';

import { CloudFormationManager } from '../../src/monitor/cloudformation-manager';
import { JobScheduler } from '../../src/monitor/JobScheduler';
import { Branch, Repository } from '../../src/monitor/models';
import { PipelineCoordinator } from '../../src/monitor/pipeline-coordinator';
import { RepositoryExplorer } from '../../src/monitor/repository-explorer';

let repositoryExplorerMock: RepositoryExplorer,
  schedulerMock: JobScheduler,
  cloudFormationManagerMock: CloudFormationManager,
  coordinator: PipelineCoordinator;

beforeAll(() => {
  repositoryExplorerMock = mock(RepositoryExplorer);
  when(repositoryExplorerMock.findSubscribedRepositories(anyOfClass(Repository))).thenResolve([
    {
      name: 'stage-R1',
      owner: 'owner1',
    },
    {
      name: 'stage-R3',
      owner: 'owner1',
    },
    {
      name: 'R2',
      owner: 'owner1',
    },
  ]);

  schedulerMock = mock(JobScheduler);

  cloudFormationManagerMock = mock(CloudFormationManager);
});

describe('pipeline coordinator', () => {
  it('should queue repositories for discovery', async () => {
    coordinator = new PipelineCoordinator(
      instance(repositoryExplorerMock),
      instance(cloudFormationManagerMock),
      instance(schedulerMock),
    );

    await coordinator.scheduleDiscoveryJobs('owner1');

    verify(schedulerMock.queueRepositoryDiscoveryJobs(anything())).once();
  });

  it('should only queue those with stage-*', async () => {
    coordinator = new PipelineCoordinator(
      instance(repositoryExplorerMock),
      instance(cloudFormationManagerMock),
      instance(schedulerMock),
    );

    await coordinator.scheduleDiscoveryJobs('owner1');

    const message = capture(schedulerMock.queueRepositoryDiscoveryJobs).first();
    expect(message.length).toBe(1);
  });

  it('should create pipelines for new branches', async () => {
    when(cloudFormationManagerMock.findPipelineStacksForRepository(anyString(), anyString())).thenResolve([
      {
        branchName: 'old',
        repository: 'R3',
        owner: 'owner1',
        stackName: 'stack1',
      },
      {
        branchName: 'very-old',
        repository: 'R3',
        owner: 'owner1',
        stackName: 'stack1',
      },
    ]);

    when(repositoryExplorerMock.findBranchConfigurations(anything())).thenResolve({
      name: 'R3',
      owner: 'owner1',
      monitoredBranches: (): Branch[] => {
        return [
          {
            branchName: 'old',
            repository: { name: 'R3', owner: 'owner1 ' },
            isMonitoredBranch: true,
            commitSha: 'someId',
          },
          {
            branchName: 'new',
            repository: { name: 'R3', owner: 'owner1 ' },
            isMonitoredBranch: true,
            commitSha: 'someId',
          },
        ];
      },
    });

    coordinator = new PipelineCoordinator(
      instance(repositoryExplorerMock),
      instance(cloudFormationManagerMock),
      instance(schedulerMock),
    );

    await coordinator.createNewPipelines({
      name: 'R3',
      owner: 'owner1',
    });

    verify(cloudFormationManagerMock.createPipeline(anyString(), anyString(), anyString())).once();
    const creationParams = capture(cloudFormationManagerMock.createPipeline).first();
    expect(creationParams[2]).toBe('new');
  });

  it('should delete pipelines for disappearing branches', async () => {
    when(cloudFormationManagerMock.findPipelineStacksForRepository(anyString(), anyString())).thenResolve([
      {
        branchName: 'old',
        repository: 'R3',
        owner: 'owner1',
        stackName: 'stack1',
      },
      {
        branchName: 'very-old',
        repository: 'R3',
        owner: 'owner1',
        stackName: 'stack1',
      },
    ]);

    when(repositoryExplorerMock.findBranchConfigurations(anything())).thenResolve({
      name: 'R3',
      owner: 'owner1',
      monitoredBranches: (): Branch[] => {
        return [
          {
            branchName: 'old',
            repository: { name: 'R3', owner: 'owner1 ' },
            isMonitoredBranch: true,
            commitSha: 'someId',
          },
          {
            branchName: 'new',
            repository: { name: 'R3', owner: 'owner1 ' },
            isMonitoredBranch: true,
            commitSha: 'someId',
          },
        ];
      },
    });

    coordinator = new PipelineCoordinator(
      instance(repositoryExplorerMock),
      instance(cloudFormationManagerMock),
      instance(schedulerMock),
    );

    await coordinator.removePipelines({
      name: 'R3',
      owner: 'owner1',
    });

    verify(cloudFormationManagerMock.deletePipeLineStack(anyString(), anyString(), anyString())).once();
    const creationParams = capture(cloudFormationManagerMock.deletePipeLineStack).first();
    expect(creationParams[2]).toBe('very-old');
  });
});
