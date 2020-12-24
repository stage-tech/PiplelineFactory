import { CloudFormationManager } from '../../src/monitor/cloudformation-manager';
import { GithubClient } from '../../src/monitor/github-client';
import { MonitorRepositoriesHandler } from '../../src/monitor/handler-monitor-repositories';
import { Repository } from '../../src/monitor/models';
import { OrganizationInfo, OrganizationManager } from '../../src/monitor/organization-manager';
import { RepositoryExplorer } from '../../src/monitor/repository-explorer';
import AuthHelper from '../auth-helper';
const OLD_ENV = process.env;
let organizationInfo: OrganizationInfo;
let githubClient: GithubClient;
beforeAll(async () => {
  jest.resetModules(); // this is important - it clears the cache
  process.env = {
    ...OLD_ENV,
    AWS_PROFILE: 'admin-stage',
    AWS_SDK_LOAD_CONFIG: '1',
  };

  const credentials = AuthHelper.LoadCredentials('stage-dev');
  console.log(credentials.accessKeyId);
  organizationInfo = await new OrganizationManager().get('stage-tech');
  githubClient = await new GithubClient(organizationInfo.githubToken);
});

beforeEach(() => {
  delete process.env.NODE_ENV;
});

afterEach(() => {
  process.env = OLD_ENV;
});

describe('Sample Test', () => {
  it('list all repos in organization ', async () => {
    const explorer = new RepositoryExplorer(githubClient, new CloudFormationManager());
    const repos = await explorer.findRepositories('stage-tech');

    console.log(JSON.stringify(repos, null, 2));
  });

  it('should list branches in a certain repository', async () => {
    const explorer = new RepositoryExplorer(githubClient, new CloudFormationManager());
    const buildConfiguration = await explorer.getRepositoryBuildConfiguration(
      new Repository('stage-tech', 'stage-door-cdk', 'master'),
    );
    console.log(JSON.stringify(buildConfiguration, null, 2));
  });

  it('Should Create messages in the queue', async () => {
    const explorer = new MonitorRepositoriesHandler({
      organizationName: 'stage-tech',
      queueUrl: 'https://sqs.eu-west-1.amazonaws.com/928065939415/repository_discovery_jobs',
    });
    const pipeline = await explorer.handler();
    console.log(pipeline);
  });
});
