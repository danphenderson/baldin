from aws_cdk import Stack, CfnOutput, aws_ec2 as ec2
from constructs import Construct

class BaldinVPCStack(Stack):
    """
    Baldin VPC Stack creates a VPC with public and private subnets across 2 availability zones.

    Outbound internet access is provided by a NAT Gateway in the public subnet.
    The VPC has DNS support and DNS hostnames enabled, so that ec2 instances in the VPC can resolve
    domain names to IP addresses and have a DNS hostname assigned by Amazon.

    # Properties
    - `vpc`: The VPC created by this stack.
    - `web_sg`: frontend react app security group
    - `api_sg``: backend api security group
    - `db_sg`: backend api db security group

    ## Security Group Rules
    1. Web Security Group:
        - Allow inbound HTTP and HTTPS traffic from the internet.
        - Allow all outbound traffic (or restrict based on specific needs).
    2. API Security Group:
        - Allow inbound traffic on the specific port(s) used by your API from the web tier or specific IPs.
        - Allow outbound traffic to the database security group on the database port.
        - Allow necessary outbound internet access, if any.
    3. Database Security Group:
        - Allow inbound traffic on the database port only from the API security group.
        - Restrict all outbound traffic, unless specific outbound access is needed.

    # Outputs
    - `VPCId is exported as an output for use in other stacks.
    """

    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # Define the VPC with public and private subnets across multiple Availability Zones
        self.vpc = ec2.Vpc(
            self, "BaldinVPC",
            max_azs=2,
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

        # Web Security Group
        self.web_sg = ec2.SecurityGroup(
            self, "WebSecurityGroup",
            vpc=self.vpc,
            description="Security group for web tier",
            allow_all_outbound=True
        )
        self.web_sg.add_ingress_rule(
            ec2.Peer.any_ipv4(),
            ec2.Port.tcp(80),
            "Allow HTTP traffic"
        )
        self.web_sg.add_ingress_rule(
            ec2.Peer.any_ipv4(),
            ec2.Port.tcp(443),
            "Allow HTTPS traffic"
        )

        # API Security Group
        self.api_sg = ec2.SecurityGroup(
            self, "APISecurityGroup",
            vpc=self.vpc,
            description="Security group for API tier",
            allow_all_outbound=True
        )
        self.api_sg.add_ingress_rule(
            ec2.Peer.security_group(self.web_sg),
            ec2.Port.tcp(8000),  # Adjust port according to your API service
            "Allow inbound API traffic from web tier"
        )

        # Database Security Group
        self.db_sg = ec2.SecurityGroup(
            self, "DatabaseSecurityGroup",
            vpc=self.vpc,
            description="Security group for database tier",
            allow_all_outbound=False  # Default, adjust if necessary
        )
        self.db_sg.add_ingress_rule(
            ec2.Peer.security_group(self.api_sg), # type: ignore
            ec2.Port.tcp(5432),  # Standard PostgreSQL port, adjust as necessary
            "Allow database access from API tier"
        )

        # Output the VPC ID and security group IDs
        CfnOutput(self, "BaldinVPCId", value=self.vpc.vpc_id, description="The ID of the Baldin VPC")
        CfnOutput(self, "WebSGId", value=self.web_sg.security_group_id, description="Web Security Group ID")
        CfnOutput(self, "APISGId", value=self.api_sg.security_group_id, description="API Security Group ID")
        CfnOutput(self, "DBSGId", value=self.db_sg.security_group_id, description="Database Security Group ID")
