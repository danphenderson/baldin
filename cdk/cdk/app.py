#!/usr/bin/env python3
from weakref import proxy
import aws_cdk as cdk

app = cdk.App()

# Add stacks here
from stacks.vpc import BaldinVPCStack
from stacks.s3 import BaldinS3Stack
from stacks.db import BaldinDBStack
from stacks.api import BaldinAPIStack
#from stacks.api import ProxyServerStack
from stacks.proxy_server import ProxyServerStack

vpc_stack = BaldinVPCStack(app, "BaldinVPCStack")
s3 = BaldinS3Stack(app, "BaldinS3Stack")
db = BaldinDBStack(app, "BaldinDBStack", vpc_stack.vpc)
api = ProxyServerStack(app, "BaldinAPIStack", vpc_stack.vpc)
#proxy_server = ProxyServerStack(app, "ProxyServerStack", vpc)

app.synth()
