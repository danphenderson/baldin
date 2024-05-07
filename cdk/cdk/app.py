#!/usr/bin/env python3
import aws_cdk as cdk

app = cdk.App()

from stacks.vpc import BaldinVPCStack
from stacks.s3 import BaldinS3Stack
from stacks.db import BaldinDBStack
from stacks.api import BaldinAPIStack

vpc_stack = BaldinVPCStack(app, "BaldinVPCStack")

s3 = BaldinS3Stack(app, "BaldinS3Stack")
db = BaldinDBStack(app, "BaldinDBStack", vpc_stack.vpc)
api = BaldinAPIStack(app, "BaldinAPIStack", vpc_stack.vpc)

app.synth()
