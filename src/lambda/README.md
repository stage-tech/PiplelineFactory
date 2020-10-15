# pipeline-factory-lambda

![](https://github.com/stage-tech/pipeline-factory-lambda/workflows/Continuous%20Integration/badge.svg) ![](https://github.com/stage-tech/pipeline-factory-lambda/workflows/Publish/badge.svg)
[![Publish](https://github.com/stage-tech/pipeline-factory-lambda/workflows/Publish/badge.svg)](https://github.com/stage-tech/pipeline-factory-lambda/actions?query=workflow%3A%22Publish%22)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=stage-tech_pipeline-factory-lambda&metric=sqale_rating&token=37e02397f12383a2c9c57bafde89b2421f961466)](https://sonarcloud.io/dashboard?id=stage-tech_pipeline-factory-lambda)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=stage-tech_pipeline-factory-lambda&metric=reliability_rating&token=37e02397f12383a2c9c57bafde89b2421f961466)](https://sonarcloud.io/dashboard?id=stage-tech_pipeline-factory-lambda)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=stage-tech_pipeline-factory-lambda&metric=security_rating&token=37e02397f12383a2c9c57bafde89b2421f961466)](https://sonarcloud.io/dashboard?id=stage-tech_pipeline-factory-lambda)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=stage-tech_pipeline-factory-lambda&metric=bugs&token=37e02397f12383a2c9c57bafde89b2421f961466)](https://sonarcloud.io/dashboard?id=stage-tech_pipeline-factory-lambda)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=stage-tech_pipeline-factory-lambda&metric=code_smells&token=37e02397f12383a2c9c57bafde89b2421f961466)](https://sonarcloud.io/dashboard?id=stage-tech_pipeline-factory-lambda)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=stage-tech_pipeline-factory-lambda&metric=vulnerabilities&token=37e02397f12383a2c9c57bafde89b2421f961466)](https://sonarcloud.io/dashboard?id=stage-tech_pipeline-factory-lambda)
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=stage-tech_pipeline-factory-lambda&metric=ncloc&token=37e02397f12383a2c9c57bafde89b2421f961466)](https://sonarcloud.io/dashboard?id=stage-tech_pipeline-factory-lambda)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=stage-tech_pipeline-factory-lambda&metric=duplicated_lines_density&token=37e02397f12383a2c9c57bafde89b2421f961466)](https://sonarcloud.io/dashboard?id=stage-tech_pipeline-factory-lambda)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=stage-tech_pipeline-factory-lambda&metric=coverage&token=37e02397f12383a2c9c57bafde89b2421f961466)](https://sonarcloud.io/dashboard?id=stage-tech_pipeline-factory-lambda)
[![Technical Debt](https://sonarcloud.io/api/project_badges/measure?project=stage-tech_pipeline-factory-lambda&metric=sqale_index&token=37e02397f12383a2c9c57bafde89b2421f961466)](https://sonarcloud.io/dashboard?id=stage-tech_pipeline-factory-lambda)

## Create a new repo from this template

1. Above the file list, click `Use this template`.
2. Use the Owner drop-down menu, and select the account you want to own the repository (`stage-tech`).
3. Type a name for your repository, and an optional description.
4. Choose a repository visibility (`private`).
5. Skip the remaining options.
6. Click `Create repository from template`
7. Clone the new repo and find and replace `pipeline-factory-lambda` with `your-new-repo-name`
8. Add a token called `BUILD_ACTION_TOKEN` to [settings/secrets](settings/secrets) - it must have all repo and read/write package permissions.
9. Set up branch protection rules under [settings/branches](settings/branches)
10. [Add the repo to dependabot](https://app.dependabot.com/accounts/stage-tech/add)
11. [Add the repo to SonarCloud](https://sonarcloud.io/organizations/stage-tech/projects)
12. Add the SonarCloud token called `SONAR_TOKEN` to [settings/secrets](settings/secrets)
13. Find and replace `{token}` with the SonarCloud status badge token
14. Add the PipelineFactory token called `PLF_API_KEY` to [settings/secrets](settings/secrets)
15. Remove this section from this readme

## CI/CD

This template includes two predefined GitHub build specs:

`.github/workflows/ci.yml` - a basic coninuous integration script which triggers yarn install, build, lint and test processes for checkins on all branches

`.github/workflows/publish.yml` - a packaging and publishing script which lints and tests the code, then auto increments the package version and publishes a package under this repo for all checkins to master

NOTE: The publishing step in `publish.yml` is disabled by default. To enable this uncomment all the lines under the `build-and-publish:` section

## Getting started

Run the following commands to configure your local environment to run the correct version of Node and install package dependencies:

```shell
nvm use
yarn
```

## Useful scripts

| Command          | What does it do?                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| yarn             | Installs package dependencies                                                                             |
| yarn build       | Transpiles TypeScript to JavaScript                                                                       |
| yarn test        | Executes all tests                                                                                        |
| yarn start       | Builds and starts the Node process                                                                        |
| yarn lint        | Builds and lints the code base                                                                            |
| yarn lambda:pack | Builds and lints the code base then creates a versioned lambda deployment package (ZIP) under ./packages/ |
