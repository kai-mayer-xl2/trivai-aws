#!/usr/bin/env node
import { App, Environment, Tags } from 'aws-cdk-lib';
import { AppStack, AppStackProps } from '../lib/app-stack';

const app = new App();
const env = {
  region: "eu-west-1"
};

function createStage(app: App, stage: string, env: Environment): [AppStack] {
  const appStack = new AppStack(app, 'trivai-app-stack', {
    stage: stage,
    env: env,
  });

  return [appStack];
}

createStage(app, "dev", env);

Tags.of(app).add('Project', 'TrivAI');
Tags.of(app).add('Responsible', '202260269+kai-mayer-xl2@users.noreply.github.com');

app.synth();
