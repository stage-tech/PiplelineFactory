import { Construct } from 'constructs';

import FactoryCodeBuildProject from './factory-codebuild-project';
import FactoryIamRole from './factory-iam-role';
import FactoryProps from './factory-props';

export default class Factory extends Construct {
  buildProjectName: string;
  constructor(scope: Construct, id: string, props: FactoryProps) {
    super(scope, id);

    const factoryIamRole = new FactoryIamRole(this, 'FactoryRole');

    this.buildProjectName = new FactoryCodeBuildProject(
      this,
      'FactoryCodeBuildProject',
      {
        pipelineTemplateBranchName: props.pipelineTemplateBranchName,
        pipelineTemplateGithubOwner: props.pipelineTemplateGithubOwner,
        pipelineTemplateRepositoryName: props.pipelineTemplateRepositoryName,
      },
      factoryIamRole.role,
    ).BuildProject.projectName;
  }
}
