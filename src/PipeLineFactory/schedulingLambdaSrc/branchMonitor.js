const { TriggerProject} = require('./triggerBuild')  ;

function getBranchNamefromRef(refvalue){
  return refvalue;

}


exports.apiBranchCreated =  function(event) {
    var payload = event.Records[0].Sns.Message;
    console.debug(payload);
    var buildParameter = JSON.parse(payload);
   
   TriggerProject(buildParameter, "create")
}

exports.apiBranchDeleted =  function(event) {
  var payload = event.Records[0].Sns.Message;
  console.debug(payload);
  var buildParameter = JSON.parse(payload);
 
 TriggerProject(buildParameter, "destroy")
}

exports.snsBranchDeleted = function(event) {
  var payload = event.Records[0].Sns.Message;
  console.debug(payload);
  var githubContext = JSON.parse(payload);
  console.debug(githubContext);  
 
  var buildParameter = {
    "repository_name" : githubContext.repository.name,
    "repository_owner" : githubContext.repository.owner.login,
    "branch" : getBranchNamefromRef(githubContext.ref)
  };

  TriggerProject(buildParameter, "destroy")
}

exports.snsBracnhCreated = function(event) {
  var payload = event.Records[0].Sns.Message;
  console.debug(payload);
  var githubContext = JSON.parse(payload);
  console.debug(githubContext);  
 
  var buildParameter = {
    "repository_name" : githubContext.repository.name,
    "repository_owner" : githubContext.repository.owner.login,
    "branch" : getBranchNamefromRef(githubContext.ref)
  };

  TriggerProject(buildParameter, "create")
}