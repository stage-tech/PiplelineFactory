process.env.SQS_QUEUE_URL = 'https://sqs.eu-west-1.amazonaws.com/928065939415/repository_discovery_jobs';
process.env.ORGANIZATION_NAME = 'stage-tech';
process.env.FACTORY_CODEBUILD_PROJECT_NAME = 'Pipeline-Factory';

module.exports = {
  globals: {
    'ts-jest': {
      tsConfig: 'tsconfig.test.json',
    },
  },
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testMatch: ['**/test/**/*.test.(ts|js)'],
  testEnvironment: 'node',
  testResultsProcessor: 'jest-sonar-reporter',
};
