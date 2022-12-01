import { expect as expectCDK, MatchStyle, matchTemplate } from '@aws-cdk/assert';
import * as cdk from 'aws-cdk-lib';
import Trigger = require('../src/trigger-stack');
/*
test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new Trigger.TriggerStack(app, 'MyTestStack', );
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
*/
