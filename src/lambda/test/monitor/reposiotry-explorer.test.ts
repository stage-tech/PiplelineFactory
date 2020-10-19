import { RepositoryExplorer } from '../../src/monitor/repository-explorer';
import AuthHelper from '../auth-helper';
const OLD_ENV = process.env;

beforeEach(() => {
  jest.resetModules(); // this is important - it clears the cache
  process.env = {
    ...OLD_ENV,
    AWS_PROFILE: 'admin-stage',
    AWS_SDK_LOAD_CONFIG: '1',
  };

  const credentials = AuthHelper.LoadCredentials('stage-dev');
  console.log(credentials.accessKeyId);

  delete process.env.NODE_ENV;
});

afterEach(() => {
  process.env = OLD_ENV;
});

describe('Sample Test', () => {
  xit('should list repositories in organization ', async () => {
    const explorer = new RepositoryExplorer('6aee2e00a67fa15a5dbf28dc468e3ad634811ca9');
    const repos = await explorer.findMonitoredRepos('stage-tech');
    repos.forEach(async (repo) => {
      const pipeline = await explorer.getBranchConfigurations(repo.owner.login, repo.name);
    });
  });

  xit('should list repositories in organization ', async () => {
    const explorer = new RepositoryExplorer('6aee2e00a67fa15a5dbf28dc468e3ad634811ca9');
    const pipeline = await explorer.getBranchConfigurations('stage-tech', 'stage-door-cdk');
    console.log(pipeline);
  });

  it('should list repositories in organization ', async () => {
    const explorer = new RepositoryMonitorHandler('6aee2e00a67fa15a5dbf28dc468e3ad634811ca9');
    const pipeline = await explorer.loadSettingsFile('stage-tech', 'stage-door-cdk', 'abdo');
    console.log(pipeline);
  });
});
