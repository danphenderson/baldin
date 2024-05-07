from aws_cdk import (
    aws_ec2 as ec2,
    aws_iam as iam,
    Stack,
    CfnOutput
)
from constructs import Construct

class ProxyServerStack(Stack):

    def __init__(self, scope: Construct, id: str, vpc, **kwargs):
        super().__init__(scope, id, **kwargs)

        # Define an Amazon Linux 2 AMI
        ami = ec2.MachineImage.latest_amazon_linux(
            generation=ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
            edition=ec2.AmazonLinuxEdition.STANDARD,
            virtualization=ec2.AmazonLinuxVirt.HVM,
            storage=ec2.AmazonLinuxStorage.GENERAL_PURPOSE
        )

        # Create a role for the EC2 instance
        role_conditions = {
            "StringEquals": {
                "ec2:Region": "us-west"
            }
        }

        ec2_instance_role = iam.Role(
            self, "ProxyInstanceRole",
            assumed_by=iam.ServicePrincipal("ec2.amazonaws.com").with_conditions(role_conditions), # type: ignore
            description="Role for the EC2 instance",
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name("AmazonSSMManagedInstanceCore")
            ]
        )

        # Launch an EC2 instance in the public subnet of the VPC
        proxy_instance = ec2.Instance(
            self, "ProxyInstance",
            instance_type=ec2.InstanceType("t3.micro"),
            machine_image=ami,
            vpc=vpc,
            role=ec2_instance_role,  # Change the type of the role parameter to IRole | None
            vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PUBLIC),
            key_name="baldin-key"  # Replace with your SSH key pair name
        )

        # Output the public IP of the proxy server
        CfnOutput(
            self, "ProxyInstancePublicIp",
            value=proxy_instance.instance_public_ip,
            description="The public IP address of the proxy server"
        )
