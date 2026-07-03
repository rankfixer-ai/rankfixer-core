// resource-mapper.js
// Infrastructure version of 'url-discoverer.js' + 'crawler.js'
// Normalizes Terraform state + Cloud API responses into universal ResourceNodes.
// Core: Drift detection between declared intent and actual reality.

// =============================================================================
// RESOURCE NODE FACTORY
// =============================================================================

/**
 * Create a universal ResourceNode from raw provider data.
 * This is the single entry point for all infrastructure normalization.
 */
export function createResourceNode(raw, provider, source) {
    const node = {
        // ── Identity ──────────────────────────────────────────
        id: extractId(raw, provider),
        type: classifyResourceType(raw, provider),
        provider,
        name: raw.tags?.Name || raw.name || raw.Name || 'unnamed',
        serviceType: raw.resource_type || raw.service || inferServiceType(raw, provider),
        environment: inferEnvironment(raw),

        // ── Source ────────────────────────────────────────────
        declaredState: source === 'declared' ? {
            exists: true,
            source: raw.file_path || raw.source || 'unknown',
            lastModified: raw.updated_at || new Date().toISOString(),
            rawConfig: raw
        } : { exists: false, source: '', lastModified: '', rawConfig: {} },

        actualState: source === 'actual' ? {
            exists: true,
            region: raw.region || raw.location || 'global',
            account: raw.account_id || raw.project || raw.subscriptionId || 'unknown',
            rawAttributes: raw
        } : { exists: false, region: '', account: '', rawAttributes: {} },

        // ── Classification ────────────────────────────────────
        criticality: inferCriticality(raw),
        isManaged: source === 'declared',

        // ── Graph Structure ───────────────────────────────────
        dependencies: extractDependencies(raw, provider),
        dependents: [],
        networkExposure: inferNetworkExposure(raw, provider),
        blastRadius: 0,

        // ── Security Posture ──────────────────────────────────
        tags: raw.tags || raw.Tags || raw.labels || {},
        policies: extractPolicies(raw, provider),
        encryption: inferEncryption(raw, provider),
        logging: inferLogging(raw, provider),
        access: inferAccess(raw, provider),

        // ── Compliance ────────────────────────────────────────
        complianceStatus: {
            cisBenchmark: 'unknown',
            soc2: 'unknown',
            pci: 'unknown',
            hipaa: 'unknown',
            customPolicies: []
        },

        // ── Drift ─────────────────────────────────────────────
        drift: {
            detected: false,
            severity: 'none',
            fields: [],
            lastDetected: ''
        },

        // ── Metadata ──────────────────────────────────────────
        createdAt: raw.creation_date || raw.created_at || new Date().toISOString(),
        modifiedAt: raw.last_modified || raw.updated_at || new Date().toISOString(),
        createdBy: raw.created_by || raw.CreatedBy || 'unknown',
        costEstimate: 0,
        notes: []
    };

    return node;
}

// =============================================================================
// ID EXTRACTION — Universal identifier across providers
// =============================================================================

function extractId(raw, provider) {
    // AWS ARN takes priority
    if (raw.arn || raw.Arn) return raw.arn || raw.Arn;
    
    // GCP self-link
    if (raw.self_link || raw.selfLink) return raw.self_link || raw.selfLink;
    
    // Azure resource ID
    if (raw.id && raw.id.startsWith('/subscriptions/')) return raw.id;
    
    // Terraform resource address
    if (raw.address) return raw.address;
    
    // Fallback: construct from type + name
    const name = raw.name || raw.Name || raw.id || 'unknown';
    return `${provider}:${inferServiceType(raw, provider)}:${name}`;
}

// =============================================================================
// TYPE CLASSIFICATION — Resource type categorization
// =============================================================================

function classifyResourceType(raw, provider) {
    const type = (raw.resource_type || raw.service || raw.type || '').toLowerCase();
    const name = (raw.name || raw.Name || '').toLowerCase();
    const arn = (raw.arn || raw.Arn || '').toLowerCase();

    // Compute
    if (type.includes('ec2') || type.includes('instance') || type.includes('compute') || 
        type.includes('vm') || name.includes('ec2') || arn.includes(':ec2:')) return 'compute';
    
    // Storage
    if (type.includes('s3') || type.includes('bucket') || type.includes('storage') || 
        type.includes('blob') || arn.includes(':s3:')) return 'storage';
    
    // Network
    if (type.includes('vpc') || type.includes('subnet') || type.includes('network') || 
        type.includes('firewall') || type.includes('security_group') || arn.includes(':sg-')) return 'network';
    
    // IAM
    if (type.includes('iam') || type.includes('role') || type.includes('policy') || 
        type.includes('serviceaccount') || arn.includes(':iam:') || arn.includes(':role/')) return 'iam';
    
    // Database
    if (type.includes('rds') || type.includes('database') || type.includes('sql') || 
        type.includes('dynamodb') || arn.includes(':rds:') || arn.includes(':dynamodb:')) return 'database';
    
    // Serverless
    if (type.includes('lambda') || type.includes('function') || type.includes('cloudfunction') || 
        arn.includes(':lambda:') || arn.includes(':function:')) return 'serverless';
    
    // CDN
    if (type.includes('cloudfront') || type.includes('cdn') || type.includes('distribution')) return 'cdn';
    
    // Encryption
    if (type.includes('kms') || type.includes('key') || type.includes('encryption') || 
        type.includes('secret')) return 'encryption';
    
    // Containers
    if (type.includes('ecs') || type.includes('kubernetes') || type.includes('container') || 
        type.includes('pod')) return 'container';
    
    // Monitoring
    if (type.includes('cloudwatch') || type.includes('monitoring') || type.includes('log') || 
        type.includes('alert')) return 'monitoring';

    return 'unknown';
}

function inferServiceType(raw, provider) {
    return raw.resource_type || raw.service || raw.type || 'unknown';
}

// =============================================================================
// ENVIRONMENT INFERENCE
// =============================================================================

function inferEnvironment(raw) {
    const tags = raw.tags || raw.Tags || raw.labels || {};
    const name = (raw.name || raw.Name || '').toLowerCase();
    const allTagValues = [...Object.values(tags), name].join(' ').toLowerCase();

    if (allTagValues.includes('prod') || allTagValues.includes('production')) return 'prod';
    if (allTagValues.includes('stag') || allTagValues.includes('staging')) return 'staging';
    if (allTagValues.includes('dev') || allTagValues.includes('development')) return 'dev';
    if (allTagValues.includes('sandbox') || allTagValues.includes('test')) return 'sandbox';

    // Check tags
    if (tags.Environment) {
        const env = tags.Environment.toLowerCase();
        if (env === 'production') return 'prod';
        if (env === 'staging') return 'staging';
        if (env === 'development') return 'dev';
    }

    return 'unknown';
}

// =============================================================================
// CRITICALITY INFERENCE
// =============================================================================

function inferCriticality(raw) {
    const tags = raw.tags || raw.Tags || {};
    if (tags.Criticality === 'critical' || tags.critical === 'true') return 'critical';
    if (tags.Criticality === 'high') return 'high';
    
    const name = (raw.name || raw.Name || '').toLowerCase();
    if (name.includes('prod') || name.includes('production')) return 'high';
    if (name.includes('core') || name.includes('primary')) return 'high';

    return 'medium';
}

// =============================================================================
// NETWORK EXPOSURE
// =============================================================================

function inferNetworkExposure(raw, provider) {
    const policies = extractPolicies(raw, provider);
    const name = (raw.name || raw.Name || '').toLowerCase();
    const type = (raw.resource_type || raw.type || '').toLowerCase();

    // Check if any policy allows public access
    for (const policy of policies) {
        if (policy.isOverlyPermissive) {
            // Check if it's truly public (0.0.0.0/0 or * principal)
            const doc = JSON.stringify(policy.document).toLowerCase();
            if (doc.includes('0.0.0.0/0') || doc.includes('"aws": "*"') || 
                doc.includes('allusers') || doc.includes('allauthenticatedusers')) {
                return 'public';
            }
        }
    }

    // S3 buckets
    if (type.includes('s3') || type.includes('bucket') || name.includes('bucket')) {
        if (raw.public_access || raw.publicAccess || (raw.acl && raw.acl.includes('public'))) {
            return 'public';
        }
    }

    // Resources in private subnets
    if (raw.subnet_id || raw.subnet || raw.vpc_id) return 'vpc';
    if (raw.is_public === false || raw.publicly_accessible === false) return 'private';

    return 'unknown';
}

// =============================================================================
// POLICY EXTRACTION
// =============================================================================

function extractPolicies(raw, provider) {
    const policies = [];

    // IAM policies (AWS)
    if (raw.policies || raw.Policies) {
        const policyList = raw.policies || raw.Policies || [];
        for (const p of (Array.isArray(policyList) ? policyList : [policyList])) {
            const doc = typeof p.document === 'string' ? JSON.parse(p.document) : (p.document || p.Document || p);
            policies.push({
                name: p.name || p.PolicyName || 'unnamed',
                type: 'iam_policy',
                document: doc,
                isOverlyPermissive: isOverlyPermissive(doc),
                violations: findPolicyViolations(doc)
            });
        }
    }

    // Security group rules (AWS)
    if (raw.ip_permissions || raw.IpPermissions || raw.security_group_rules) {
        const rules = raw.ip_permissions || raw.IpPermissions || raw.security_group_rules || [];
        for (const rule of (Array.isArray(rules) ? rules : [rules])) {
            const ruleDoc = {
                fromPort: rule.from_port || rule.FromPort,
                toPort: rule.to_port || rule.ToPort,
                ipProtocol: rule.ip_protocol || rule.IpProtocol,
                ipRanges: (rule.ip_ranges || rule.IpRanges || []).map(r => r.cidr_ip || r.CidrIp)
            };
            policies.push({
                name: `sg-rule-${ruleDoc.fromPort}-${ruleDoc.toPort}`,
                type: 'security_group_rule',
                document: ruleDoc,
                isOverlyPermissive: isOverlyPermissive(ruleDoc),
                violations: findSecurityGroupViolations(ruleDoc)
            });
        }
    }

    // Bucket policies (AWS S3)
    if (raw.bucket_policy || raw.policy) {
        const bucketPolicy = typeof raw.bucket_policy === 'string' ? 
            JSON.parse(raw.bucket_policy) : (raw.bucket_policy || raw.policy);
        policies.push({
            name: 'bucket-policy',
            type: 'bucket_policy',
            document: bucketPolicy,
            isOverlyPermissive: isOverlyPermissive(bucketPolicy),
            violations: findPolicyViolations(bucketPolicy)
        });
    }

    return policies;
}

function isOverlyPermissive(document) {
    const doc = JSON.stringify(document).toLowerCase();
    return (
        doc.includes('0.0.0.0/0') ||
        doc.includes('"aws": "*"') ||
        doc.includes('"principal": "*"') ||
        doc.includes('allusers') ||
        doc.includes('allauthenticatedusers') ||
        doc.includes('"action": "*"') ||
        doc.includes('"resource": "*"')
    );
}

function findPolicyViolations(document) {
    const violations = [];
    const doc = JSON.stringify(document).toLowerCase();

    if (doc.includes('0.0.0.0/0')) violations.push('Open to entire internet (0.0.0.0/0)');
    if (doc.includes('"aws": "*"')) violations.push('Principal is wildcard (*)');
    if (doc.includes('"principal": "*"')) violations.push('Principal is wildcard (*)');
    if (doc.includes('"action": "*"')) violations.push('All actions allowed (*)');
    if (doc.includes('"resource": "*"')) violations.push('All resources accessible (*)');
    if (doc.includes('allusers')) violations.push('Public access granted (AllUsers)');
    if (doc.includes('"effect": "allow"') && doc.includes('"principal": "*"')) {
        violations.push('Public principal with Allow effect');
    }

    return violations;
}

function findSecurityGroupViolations(rule) {
    const violations = [];
    const fromPort = rule.fromPort || rule.from_port || 0;
    const toPort = rule.toPort || rule.to_port || 65535;

    if (rule.ipRanges) {
        for (const range of (Array.isArray(rule.ipRanges) ? rule.ipRanges : [rule.ipRanges])) {
            const cidr = range.cidr_ip || range.CidrIp || range;
            if (cidr === '0.0.0.0/0' || cidr === '::/0') {
                if (fromPort === 22) violations.push('SSH open to world (port 22, 0.0.0.0/0)');
                if (fromPort === 3389) violations.push('RDP open to world (port 3389, 0.0.0.0/0)');
                if (fromPort <= 1024) violations.push(`Well-known port ${fromPort} open to world`);
                if (fromPort === 0 && toPort === 65535) violations.push('All ports open to world');
                if (!violations.length) violations.push(`Port ${fromPort}-${toPort} open to world`);
            }
        }
    }

    return violations;
}

// =============================================================================
// ENCRYPTION INFERENCE
// =============================================================================

function inferEncryption(raw, provider) {
    const encryption = {
        atRest: false,
        inTransit: false,
        keyManaged: false,
        algorithm: undefined
    };

    // Check encryption configs
    if (raw.encryption || raw.Encryption || raw.server_side_encryption) {
        const enc = raw.encryption || raw.Encryption || raw.server_side_encryption || {};
        if (enc.enabled || enc.Enabled || enc.sse_algorithm || enc.SSEAlgorithm) {
            encryption.atRest = true;
            encryption.algorithm = enc.sse_algorithm || enc.SSEAlgorithm || enc.algorithm;
        }
    }

    // S3 buckets
    if (raw.bucket_encryption || (raw.tags && raw.tags.encryption)) {
        encryption.atRest = true;
    }

    // RDS instances
    if (raw.storage_encrypted || raw.StorageEncrypted || raw.encrypted) {
        encryption.atRest = true;
    }

    // KMS key indicates managed encryption
    if (raw.kms_key_id || raw.KmsKeyId || raw.kms_key_arn) {
        encryption.atRest = true;
        encryption.keyManaged = true;
    }

    // HTTPS/TLS enforcement
    if (raw.https_only || raw.force_ssl || raw.require_ssl || raw.tls_policy) {
        encryption.inTransit = true;
    }

    return encryption;
}

// =============================================================================
// LOGGING INFERENCE
// =============================================================================

function inferLogging(raw, provider) {
    const logging = {
        enabled: false,
        destination: undefined,
        logTypes: []
    };

    if (raw.logging || raw.Logging || raw.logs) {
        logging.enabled = true;
        if (raw.log_types) logging.logTypes = raw.log_types;
        if (raw.log_destination) logging.destination = raw.log_destination;
    }

    if (raw.access_logs || raw.AccessLogs) logging.logTypes.push('access');
    if (raw.audit_logs || raw.AuditLogs) logging.logTypes.push('audit');
    if (raw.cloudwatch_logs || raw.CloudWatchLogs) {
        logging.enabled = true;
        logging.logTypes.push('security');
    }

    return logging;
}

// =============================================================================
// ACCESS LEVEL
// =============================================================================

function inferAccess(raw, provider) {
    if (raw.publicly_accessible || raw.PubliclyAccessible || 
        raw.public_access || raw.PublicAccess) return 'public';
    
    if (raw.authenticated_access || raw.AuthenticatedAccess) return 'authenticated';
    
    if (raw.cross_account_access || raw.CrossAccountAccess) return 'cross-account';
    
    const policies = extractPolicies(raw, provider);
    for (const p of policies) {
        if (p.isOverlyPermissive) return 'public';
    }

    return 'internal';
}

// =============================================================================
// DEPENDENCY EXTRACTION
// =============================================================================

function extractDependencies(raw, provider) {
    const deps = [];

    // Common dependency fields
    const depFields = [
        'vpc_id', 'VpcId', 'subnet_id', 'SubnetId',
        'security_group_ids', 'SecurityGroups', 'SecurityGroupIds',
        'iam_role', 'IamRole', 'role_arn', 'RoleArn',
        'kms_key_id', 'KmsKeyId',
        'depends_on', 'DependsOn',
        'source_security_group_id', 'SourceSecurityGroupId',
        'db_subnet_group', 'DBSubnetGroup'
    ];

    for (const field of depFields) {
        if (raw[field]) {
            const val = raw[field];
            if (Array.isArray(val)) deps.push(...val);
            else deps.push(val);
        }
    }

    // Terraform-specific: explicit depends_on
    if (raw.depends_on && Array.isArray(raw.depends_on)) {
        deps.push(...raw.depends_on);
    }

    return [...new Set(deps)]; // Deduplicate
}

// =============================================================================
// DRIFT DETECTION — The Core Engine
// =============================================================================

/**
 * Compare declared state (IaC) against actual state (Cloud API).
 * Returns a drift report with per-field violations.
 * 
 * This is the infrastructure equivalent of comparing sitemap vs crawl.
 */
export function detectDrift(declaredNode, actualNode) {
    if (!declaredNode || !actualNode) {
        return {
            detected: true,
            severity: 'critical',
            fields: [{
                path: 'resource',
                declared: declaredNode ? 'exists' : 'missing',
                actual: actualNode ? 'exists' : 'missing',
                risk: declaredNode ? 'Resource exists in IaC but not in cloud (failed deployment?)' : 
                       'Resource exists in cloud but not in IaC (manual creation / drift)'
            }],
            lastDetected: new Date().toISOString()
        };
    }

    const driftFields = [];

    // Compare critical security fields
    const comparisons = [
        { path: 'networkExposure', declared: declaredNode.networkExposure, actual: actualNode.networkExposure, 
          isCritical: true, risk: (d, a) => `Network exposure changed from "${d}" to "${a}"` },
        { path: 'access', declared: declaredNode.access, actual: actualNode.access, 
          isCritical: true, risk: (d, a) => `Access level changed from "${d}" to "${a}"` },
        { path: 'encryption.atRest', declared: declaredNode.encryption.atRest, actual: actualNode.encryption.atRest, 
          isCritical: true, risk: () => 'Encryption at rest was disabled or removed' },
        { path: 'encryption.inTransit', declared: declaredNode.encryption.inTransit, actual: actualNode.encryption.inTransit, 
          isCritical: true, risk: () => 'Encryption in transit was disabled' },
        { path: 'logging.enabled', declared: declaredNode.logging.enabled, actual: actualNode.logging.enabled, 
          isCritical: false, risk: () => 'Logging was disabled' },
    ];

    for (const comp of comparisons) {
        if (comp.declared !== comp.actual) {
            driftFields.push({
                path: comp.path,
                declared: comp.declared,
                actual: comp.actual,
                risk: typeof comp.risk === 'function' ? comp.risk(comp.declared, comp.actual) : comp.risk,
                isCritical: comp.isCritical
            });
        }
    }

    // Compare policies
    const declaredPolicies = JSON.stringify(declaredNode.policies || []);
    const actualPolicies = JSON.stringify(actualNode.policies || []);
    if (declaredPolicies !== actualPolicies) {
        // Find which policies changed
        const declaredNames = new Set((declaredNode.policies || []).map(p => p.name));
        const actualNames = new Set((actualNode.policies || []).map(p => p.name));

        for (const name of declaredNames) {
            if (!actualNames.has(name)) {
                driftFields.push({
                    path: `policies.${name}`,
                    declared: 'present',
                    actual: 'removed',
                    risk: `Policy "${name}" was removed`,
                    isCritical: true
                });
            }
        }
        for (const name of actualNames) {
            if (!declaredNames.has(name)) {
                const policy = actualNode.policies.find(p => p.name === name);
                driftFields.push({
                    path: `policies.${name}`,
                    declared: 'absent',
                    actual: 'added',
                    risk: `New policy "${name}" added outside IaC${policy?.isOverlyPermissive ? ' — OVERLY PERMISSIVE' : ''}`,
                    isCritical: policy?.isOverlyPermissive || false
                });
            }
        }
    }

    // Compare tags (non-critical unless security tags changed)
    const declaredTags = JSON.stringify(declaredNode.tags || {});
    const actualTags = JSON.stringify(actualNode.tags || {});
    if (declaredTags !== actualTags) {
        driftFields.push({
            path: 'tags',
            declared: Object.keys(declaredNode.tags || {}).length + ' tags',
            actual: Object.keys(actualNode.tags || {}).length + ' tags',
            risk: 'Tags modified outside IaC',
            isCritical: false
        });
    }

    const hasDrift = driftFields.length > 0;
    const hasCriticalDrift = driftFields.some(f => f.isCritical);

    return {
        detected: hasDrift,
        severity: hasCriticalDrift ? 'critical' : hasDrift ? 'warning' : 'none',
        fields: driftFields,
        lastDetected: hasDrift ? new Date().toISOString() : ''
    };
}

// =============================================================================
// RESOURCE MAPPER — Main Interface
// =============================================================================

/**
 * Map declared (IaC) and actual (Cloud API) resources into a unified graph.
 * 
 * @param {Array} declaredResources - Resources from Terraform state / IaC files
 * @param {Array} actualResources - Resources from Cloud API calls
 * @param {string} provider - 'aws' | 'gcp' | 'azure'
 * @returns {object} { nodes: Map<id, ResourceNode>, driftReport: DriftSummary }
 */
export function mapResources(declaredResources, actualResources, provider) {
    console.log(`[ResourceMapper] Mapping ${declaredResources.length} declared + ${actualResources.length} actual resources (${provider})`);

    const nodes = new Map();

    // Normalize declared resources
    for (const raw of declaredResources) {
        const node = createResourceNode(raw, provider, 'declared');
        nodes.set(node.id, node);
    }

    // Normalize actual resources — merge with declared or create new
    for (const raw of actualResources) {
        const actualNode = createResourceNode(raw, provider, 'actual');
        
        if (nodes.has(actualNode.id)) {
            // Merge: resource exists in both IaC and cloud
            const declaredNode = nodes.get(actualNode.id);
            declaredNode.actualState = actualNode.actualState;
            declaredNode.isManaged = true;
            
            // Detect drift
            const drift = detectDrift(declaredNode, actualNode);
            declaredNode.drift = drift;
        } else {
            // New: resource exists in cloud but not in IaC (manual creation)
            actualNode.drift = {
                detected: true,
                severity: 'critical',
                fields: [{
                    path: 'resource',
                    declared: 'absent',
                    actual: 'present',
                    risk: 'Resource exists in cloud but is NOT defined in IaC — manual creation or drift'
                }],
                lastDetected: new Date().toISOString()
            };
            nodes.set(actualNode.id, actualNode);
        }
    }

    // Mark IaC-only resources (defined but not deployed)
    for (const [id, node] of nodes) {
        if (node.declaredState.exists && !node.actualState.exists) {
            node.drift = {
                detected: true,
                severity: 'warning',
                fields: [{
                    path: 'resource',
                    declared: 'present',
                    actual: 'absent',
                    risk: 'Resource defined in IaC but does not exist in cloud — failed deployment?'
                }],
                lastDetected: new Date().toISOString()
            };
        }
    }

    // Build dependency graph
    for (const [id, node] of nodes) {
        for (const depId of node.dependencies) {
            if (nodes.has(depId)) {
                nodes.get(depId).dependents.push(id);
            }
        }
    }

    // Calculate blast radius
    for (const [id, node] of nodes) {
        node.blastRadius = calculateBlastRadius(id, nodes);
    }

    // Summary
    const driftNodes = [...nodes.values()].filter(n => n.drift.detected);
    const criticalDrift = driftNodes.filter(n => n.drift.severity === 'critical');
    const unmanaged = [...nodes.values()].filter(n => !n.isManaged);

    const summary = {
        totalResources: nodes.size,
        declaredResources: declaredResources.length,
        actualResources: actualResources.length,
        managedResources: [...nodes.values()].filter(n => n.isManaged).length,
        unmanagedResources: unmanaged.length,
        driftDetected: driftNodes.length,
        criticalDrift: criticalDrift.length,
        publicExposure: [...nodes.values()].filter(n => n.networkExposure === 'public').length,
        overlyPermissivePolicies: [...nodes.values()].filter(n => 
            n.policies.some(p => p.isOverlyPermissive)
        ).length
    };

    console.log(`[ResourceMapper] ${nodes.size} resources | ${driftNodes.length} drifted | ${criticalDrift.length} critical`);
    console.log(`[ResourceMapper] ${unmanaged.length} unmanaged | ${summary.publicExposure} public | ${summary.overlyPermissivePolicies} overly-permissive`);

    return { nodes, summary };
}

// =============================================================================
// BLAST RADIUS CALCULATION
// =============================================================================

function calculateBlastRadius(nodeId, allNodes) {
    const visited = new Set();
    const queue = [nodeId];
    let count = 0;

    while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current)) continue;
        visited.add(current);
        count++;

        const node = allNodes.get(current);
        if (node) {
            for (const depId of node.dependents) {
                if (!visited.has(depId)) queue.push(depId);
            }
        }
    }

    return count - 1; // Don't count self
}

// =============================================================================
// EXPORTS
// =============================================================================

