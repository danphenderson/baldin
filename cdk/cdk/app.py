#!/usr/bin/env python3
# Path: cdk/cdk/app.py
import aws_cdk as cdk

app = cdk.App()

from stacks.vpc import BaldinVPCStack
from stacks.s3 import BaldinS3Stack
from stacks.iam import BaldinIAMStack
from stacks.ecr import BaldinECRStack
from stacks.db import BaldinDBStack
from stacks.api import BaldinAPIStack

vpc_stack = BaldinVPCStack(app, "BaldinVPCStack")

s3_stack = BaldinS3Stack(app, "BaldinS3Stack")

iam_stack = BaldinIAMStack(app, "BaldinIAMStack")

ecr_stack = BaldinECRStack(app, "BaldinECRStack")

db_stack = BaldinDBStack(app, "BaldinDBStack", vpc=vpc_stack.vpc)

api_stack = BaldinAPIStack(app, "BaldinAPIStack", vpc = vpc_stack.vpc, api_sg = vpc_stack.api_sg)

app.synth()
