// test-infra.js
// Infrastructure Control Plane — Dry Run Test
// Simulates AWS drift scenarios without real credentials.

import { mapResources } from './resource-mapper.js';
import { generateRemediationPlan } from './remediation-engine.js';
import { StateStore, runControlLoop } from './state-manager.js';

// ── Mock Declared State (Terraform) ────────────────────────────────
const declaredResources = [
    {
        // EC2 instance — properly configured
        address: 'aws_instance.web_server',
        arn: 'arn:aws:ec2:us-east-1:123456789012:instance/i-001',
        resource_type: 'aws_instance',
        name: 'web-server-prod',
        tags: { Name: 'web-server-prod', Environment: 'production', Criticality: 'high' },
        vpc_id: 'vpc-001',
        subnet_id: 'subnet-001a',
        security_group_ids: ['sg-internal'],
        encryption: { enabled: true },
        logging: { enabled: true, log_types: ['access', 'audit'] },
        file_path: 'modules/compute/main.tf'
    },
    {
        // EC2 instance — security group restricted in IaC
        address: 'aws_instance.api_server',
        arn: 'arn:aws:ec2:us-east-1:123456789012:instance/i-002',
        resource_type: 'aws_instance',
        name: 'api-server-prod',
        tags: { Name: 'api-server-prod', Environment: 'production' },
        vpc_id: 'vpc-001',
        subnet_id: 'subnet-001b',
        security_group_ids: ['sg-api-internal'],
        encryption: { enabled: true },
        file_path: 'modules/compute/main.tf'
    },
    {
        // S3 bucket — private in IaC
        address: 'aws_s3_bucket.logs',
        arn: 'arn:aws:s3:::company-logs-prod',
        resource_type: 'aws_s3_bucket',
        name: 'company-logs-prod',
        tags: { Name: 'company-logs-prod', Environment: 'production' },
        encryption: { enabled: true, algorithm: 'AES256' },
        logging: { enabled: true },
        public_access: false,
        file_path: 'modules/storage/s3.tf'
    },
    {
        // IAM role — restricted in IaC
        address: 'aws_iam_role.app_role',
        arn: 'arn:aws:iam::123456789012:role/app-role',
        resource_type: 'aws_iam_role',
        name: 'app-role',
        tags: { Environment: 'production' },
        policies: [{
            name: 'app-policy',
            type: 'iam_policy',
            document: {
                Version: '2012-10-17',
                Statement: [{
                    Effect: 'Allow',
                    Action: ['s3:GetObject', 's3:PutObject'],
                    Resource: ['arn:aws:s3:::company-logs-prod/*']
                }]
            }
        }],
        file_path: 'modules/iam/roles.tf'
    },
    {
        // RDS instance — encrypted in IaC
        address: 'aws_db_instance.main',
        arn: 'arn:aws:rds:us-east-1:123456789012:db/main-db',
        resource_type: 'aws_db_instance',
        name: 'main-db',
        tags: { Name: 'main-db', Environment: 'production', Criticality: 'critical' },
        storage_encrypted: true,
        kms_key_id: 'arn:aws:kms:us-east-1:123456789012:key/kms-001',
        publicly_accessible: false,
        file_path: 'modules/database/rds.tf'
    },
    {
        // Resource defined in IaC but not deployed
        address: 'aws_instance.bastion',
        arn: 'arn:aws:ec2:us-east-1:123456789012:instance/i-099',
        resource_type: 'aws_instance',
        name: 'bastion-staging',
        tags: { Name: 'bastion-staging', Environment: 'staging' },
        file_path: 'modules/bastion/main.tf'
    }
];

// ── Mock Actual State (AWS API) ────────────────────────────────────
const actualResources = [
    {
        // EC2 — matches declared (no drift)
        arn: 'arn:aws:ec2:us-east-1:123456789012:instance/i-001',
        resource_type: 'aws_instance',
        name: 'web-server-prod',
        tags: { Name: 'web-server-prod', Environment: 'production' },
        region: 'us-east-1',
        account_id: '123456789012',
        vpc_id: 'vpc-001',
        subnet_id: 'subnet-001a',
        security_group_ids: ['sg-internal'],
        encryption: { enabled: true },
        logging: { enabled: true }
    },
    {
        // EC2 — security group opened to 0.0.0.0/0 (DRIFT!)
        arn: 'arn:aws:ec2:us-east-1:123456789012:instance/i-002',
        resource_type: 'aws_instance',
        name: 'api-server-prod',
        tags: { Name: 'api-server-prod', Environment: 'production' },
        region: 'us-east-1',
        account_id: '123456789012',
        vpc_id: 'vpc-001',
        subnet_id: 'subnet-001b',
        security_group_ids: ['sg-api-internal'],
        security_group_rules: [{
            from_port: 22,
            to_port: 22,
            ip_protocol: 'tcp',
            ip_ranges: [{ cidr_ip: '0.0.0.0/0' }]
        }],
        encryption: { enabled: true }
    },
    {
        // S3 bucket — public access enabled (DRIFT!)
        arn: 'arn:aws:s3:::company-logs-prod',
        resource_type: 'aws_s3_bucket',
        name: 'company-logs-prod',
        tags: { Name: 'company-logs-prod' },
        region: 'us-east-1',
        account_id: '123456789012',
        public_access: true,
        acl: 'public-read',
        encryption: { enabled: false },  // Encryption also disabled
        logging: { enabled: false }      // Logging also disabled
    },
    {
        // IAM role — overly-permissive policy added (DRIFT!)
        arn: 'arn:aws:iam::123456789012:role/app-role',
        resource_type: 'aws_iam_role',
        name: 'app-role',
        region: 'global',
        account_id: '123456789012',
        policies: [
            {
                name: 'app-policy',
                type: 'iam_policy',
                document: {
                    Version: '2012-10-17',
                    Statement: [{
                        Effect: 'Allow',
                        Action: ['s3:GetObject', 's3:PutObject'],
                        Resource: ['arn:aws:s3:::company-logs-prod/*']
                    }]
                }
            },
            {
                // This policy was added manually — NOT in IaC
                name: 'admin-access-manual',
                type: 'iam_policy',
                document: {
                    Version: '2012-10-17',
                    Statement: [{
                        Effect: 'Allow',
                        Action: '*',
                        Resource: '*'
                    }]
                }
            }
        ]
    },
    {
        // RDS — encryption disabled (DRIFT!)
        arn: 'arn:aws:rds:us-east-1:123456789012:db/main-db',
        resource_type: 'aws_db_instance',
        name: 'main-db',
        tags: { Name: 'main-db', Environment: 'production' },
        region: 'us-east-1',
        account_id: '123456789012',
        storage_encrypted: false,
        publicly_accessible: false
    },
    {
        // Manual creation — NOT in IaC at all (DRIFT!)
        arn: 'arn:aws:s3:::manual-backup-bucket',
        resource_type: 'aws_s3_bucket',
        name: 'manual-backup-bucket',
        tags: { Name: 'manual-backup-bucket' },
        region: 'us-east-1',
        account_id: '123456789012',
        public_access: false,
        encryption: { enabled: false }
    },
    {
        // EC2 — matches declared
        arn: 'arn:aws:ec2:us-east-1:123456789012:instance/i-001',
        resource_type: 'aws_instance',
        name: 'web-server-prod',
        tags: { Name: 'web-server-prod', Environment: 'production' },
        region: 'us-east-1',
        account_id: '123456789012',
        vpc_id: 'vpc-001',
        subnet_id: 'subnet-001a',
        security_group_ids: ['sg-internal'],
        encryption: { enabled: true },
        logging: { enabled: true }
    }
];

// ── Run ────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════');
console.log('  Infrastructure Control Plane — Dry Run');
console.log('  Simulated AWS environment');
console.log('═══════════════════════════════════════════\n');

console.log(`Declared (IaC): ${declaredResources.length} resources`);
console.log(`Actual (Cloud): ${actualResources.length} resources`);
console.log(`Expected drift scenarios:`);
console.log(`  1. EC2 security group opened to 0.0.0.0/0`);
console.log(`  2. S3 bucket public access enabled`);
console.log(`  3. IAM role with overly-permissive policy added`);
console.log(`  4. RDS encryption disabled`);
console.log(`  5. S3 bucket created manually (not in IaC)`);
console.log(`  6. Bastion host in IaC but not deployed\n`);

// Run the full control loop
const report = await runControlLoop(
    declaredResources,
    actualResources,
    'aws',
    {
        environment: 'prod',
        dryRun: true,
        autoApprove: false,
        blastRadiusLimit: 50,
        storePath: './infra-state'
    }
);

// Print actions that would be taken
console.log('\n─── Remediation Actions (Dry Run) ───');
const plan = new StateStore('./infra-state').getLatestPlan();
if (plan && plan.actions) {
    for (const action of plan.actions) {
        const icon = action.severity === 'critical' ? '🔴' : action.severity === 'warning' ? '🟡' : '🔵';
        const auto = action.autoApprovable ? '[AUTO]' : '[REVIEW]';
        console.log(`${icon} ${auto} ${action.summary}`);
        if (action.terraformPatch?.filename) {
            console.log(`   Patch: ${action.terraformPatch.filename}`);
        }
        if (action.terraformCommand) {
            console.log(`   Cmd: ${action.terraformCommand}`);
        }
    }
}

// Print verification status
console.log('\n─── System Health ───');
const store = new StateStore('./infra-state');
const summary = store.getSystemSummary();
console.log(`Actions: ${summary.actions.total} total`);
console.log(`  Pending: ${summary.actions.pending}`);
console.log(`  Resolved: ${summary.actions.resolved}`);
console.log(`  Failed: ${summary.actions.failed}`);
console.log(`  Deferred: ${summary.actions.deferred}`);
console.log(`Health: ${(summary.health.resolvedRate * 100).toFixed(0)}% resolution rate`);

console.log('\n✅ Dry run complete. Check ./infra-state/ for persisted state.');
