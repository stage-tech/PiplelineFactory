
#!/bin/bash
PROFILE=$1 # aws profile

# If optional argument 'PROFILE' is provided - export it
if [[ ! -z $PROFILE ]]; then
    export AWS_PROFILE=$PROFILE
    echo using profile $AWS_PROFILE
fi

trap die ERR
die()
{
  echo "Failed in script \"$0\" at line $BASH_LINENO"
  exit 1
}
hash=$(git rev-parse --short HEAD)
branch_name=$(git rev-parse --abbrev-ref HEAD)
package_name="pipeline-factory-lambda"
repo_name=$(basename `git rev-parse --show-toplevel`)
s3_bucket_name="salt-deployment-packages"
echo version number is $hash
yarn install
yarn lint
rm -rf node_modules
yarn --prod
yarn lambda:pack
mkdir packages -p; 
package_file_name="${package_name}-${hash}.zip"
package_file_path="./packages/${package_file_name}"
s3_package_path="s3://$s3_bucket_name/$repo_name/$branch_name/$package_file_name"

zip -r $package_file_path . -x '*.ENV' '*.eslintrc*' './packages/*' './src/*' './test/*' './coverage/*' '*.git*' '*.n*rc' '*.DS_Store' 'yarn.lock' '.prettierrc.js' 'tsconfig.json' '.eslintignore' '.vscode/*' 'jest.config.js'
aws s3 cp $package_file_path $s3_package_path
