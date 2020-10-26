import { MonitorRepositoriesHandler } from '../../src/monitor-repositories-handler';
import { OrganizationInfo, OrganizationManager } from '../../src/monitor/organization-manager';
import { RepositoryExplorer } from '../../src/monitor/repository-explorer';
import AuthHelper from '../auth-helper';
const OLD_ENV = process.env;
let organizationInfo: OrganizationInfo;
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
});

beforeEach(() => {
  delete process.env.NODE_ENV;
});

afterEach(() => {
  process.env = OLD_ENV;
});

describe('Sample Test', () => {
  it('list all repos in organization ', async () => {
    const explorer = new RepositoryExplorer(organizationInfo.githubToken);
    const repos = await explorer.findSubscribedRepositories('stage-tech');

    console.log(JSON.stringify(repos, null, 2));
  });

  it('should list branches in a certain repository', async () => {
    const explorer = new RepositoryExplorer(organizationInfo.githubToken);
    const pipeline = await explorer.getBranchConfigurations({
      name: 'stage-door-cdk',
      owner: 'stage-tech',
    });
    console.log(pipeline);
  });

  xit('Should Create messages in the queue', async () => {
    const explorer = new MonitorRepositoriesHandler({
      organizationName: 'stage-tech',
      queueUrl: 'https://sqs.eu-west-1.amazonaws.com/928065939415/repository_discovery_jobs',
    });
    const pipeline = await explorer.handler(null, null);
    console.log(pipeline);
  });
});
