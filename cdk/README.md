
# About

Ship Baldin to AWS using CloudFormation with Infrastructure defined as Code (IaC) using the AWS Cloud Development Kit (CDK).'


## Prerequisites
Create a virtual environment and activate it, e.g. with pipenv:

```
$ pipenv install
$ pipenv shell
```

Create a `.env` file in the root of the project with the following variables set:

```txt
AWS_REGION=
AWS_ACCOUNT=
```

Note, you can also set these variables in your shell environment. The AWS_ACCOUNT variable refers can be found in the AWS console under your account settings. The AWS_REGION variable is the region you want to deploy the stack to.


## Usage

At this point you can now build Baldin's infrastructure using the CDK CLI. The following commands are available:

To synthesize the CloudFormation template:

```
$ cdk synth
```

To list the stacks in the app:

```
$ cdk ls
```

To deploy the stack:

```
$ cdk deploy
```

To destroy the stack:

```
$ cdk destroy
```

To see the difference between the deployed stack and the current state:

```
$ cdk diff <STACK-ID>
```

Note, the `STACK-ID` can be found in the output of the `cdk ls` command. Also, the first time you deploy the stack you must bootstrap the environment:

```
$ cdk bootstrap
```

Enjoy!
