import { anyString, capture, instance, mock, verify } from 'ts-mockito';

import { CloudFormationManager } from '../../src/monitor/cloudformation-manager';
import { JobScheduler } from '../../src/monitor/JobScheduler';
import { Branch, Repository, RepositoryBuildConfiguration } from '../../src/monitor/models';
import { PipelineCoordinator } from '../../src/monitor/pipeline-coordinator';
import { RepositoryExplorer } from '../../src/monitor/repository-explorer';

let repositoryExplorerMock: RepositoryExplorer,
  schedulerMock: JobScheduler,
  cloudFormationManagerMock: CloudFormationManager,
  coordinator: PipelineCoordinator;

const repo: Repository = {
  branches: [
    new Branch('dev', 'commit1'),
    new Branch('new1', 'commit2'),
    new Branch('new2', 'commit2'),
    new Branch('existing1', 'commit3'),
    new Branch('existinG2', 'commit2'),
    new Branch('ignored1', 'commit3'),
  ],
  defaultBranch: 'dev',
  name: 'myRepo',
  owner: 'myOrg',
  repositoryId: 'myId',
  settings: { monitoredBranches: ['new1', 'new2', 'existinG2', 'exisTing1'] },
  topics: ['pipeline-factory'],
};

const alreadyMonitoredBranches = ['existing1', 'existinG2', 'IGnored1'];
const buildConfigs = new RepositoryBuildConfiguration(repo, alreadyMonitoredBranches);

beforeAll(() => {
  repositoryExplorerMock = mock(RepositoryExplorer);
  schedulerMock = mock(JobScheduler);
  cloudFormationManagerMock = mock(CloudFormationManager);

  coordinator = new PipelineCoordinator(
    instance(repositoryExplorerMock),
    instance(cloudFormationManagerMock),
    instance(schedulerMock),
  );
});

describe('pipeline coordinator', () => {
  it('should create pipelines for new branches', async () => {
    await coordinator.createNewPipelines(buildConfigs).then(() => {
      verify(cloudFormationManagerMock.createPipeline(anyString(), anyString(), anyString())).thrice();
    });
  });

  it('should delete pipelines for disappearing branches', async () => {
    await coordinator.cleanObsoletePipelines(buildConfigs).then(() => {
      verify(cloudFormationManagerMock.deletePipeLineStack(anyString(), anyString(), anyString())).once();
    });
  });
});
