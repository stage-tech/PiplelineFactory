
#!/bin/bash
trap die ERR
die()
{
  echo "Failed in script \"$0\" at line $BASH_LINENO"
  exit 1
}
hash=$1
echo version number is $hash
yarn install
yarn lint
rm -rf node_modules
yarn --prod
yarn lambda:pack

