
# About

Ship Baldin to AWS using CloudFormation with Infrastructure defined as Code (IaC) using the AWS Cloud Development Kit (CDK).


### Prerequisites
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
The AWS_ACCOUNT ID value can be found in the AWS console under your account settings.

### AWS CDK CLI

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

Note, the first time you deploy with the AWS CDK CLI, you must boostrap your account:

```
$ cdk bootstrap
```

### Shipping Baldin

To ship Baldin to AWS, you must deploy the stacks in roughly the following order:

1. `BaldinIAMStack`
2. `BaldinVPCStack`
3. `BaldinS3Stack`
4. `BaldinECRStack`
5. `BaldinDBStack`
6. `BaldinAPIStack`

Enjoy!
