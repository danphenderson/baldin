#!/usr/bin/env python3
from weakref import proxy
import aws_cdk as cdk

app = cdk.App()

# Add stacks here
from stacks.vpc import VPCStack
from stacks.s3 import S3Stack
from stacks.proxy_server import ProxyServerStack

vpc = VPCStack(app, "VPCStack")
s3 = S3Stack(app, "S3Stack")
#proxy_server = ProxyServerStack(app, "ProxyServerStack", vpc)

app.synth()
