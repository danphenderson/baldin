from aws_cdk import Stack, CfnOutput, aws_ec2 as ec2
from constructs import Construct

class BaldinVPCStack(Stack):

    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # Define the VPC with public and private subnets across multiple Availability Zones
        self.vpc = ec2.Vpc(
            self, "BaldinVPC",
            max_azs=2,  # Set to at least 2 Availability Zones
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    name="PublicSubnet",
                    subnet_type=ec2.SubnetType.PUBLIC,
                    cidr_mask=24
                ),
                ec2.SubnetConfiguration(
                    name="PrivateSubnet",
                    subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    cidr_mask=24
                )
            ],
            nat_gateways=1,
            enable_dns_hostnames=True,
            enable_dns_support=True,
        )

        # Output the VPC ID
        CfnOutput(
            self, "BaldinVPCId",
            value=self.vpc.vpc_id,
            description="The ID of the Baldin VPC",
        )
