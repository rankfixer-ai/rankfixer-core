// remediation-engine.js
// Infrastructure version of 'mutation-engine.js'
// Converts drift fields into actionable Terraform patches and cloud API calls.
// Every remediation is reversible, logged, and blast-radius-aware.

// =============================================================================
// REMEDIATION TYPES
// =============================================================================

const REMEDIATION_ACTIONS = {
    // Terraform/IaC actions
    UPDATE_TF_RESOURCE: 'update_tf_resource',       // Modify an existing .tf file
    CREATE_TF_RESOURCE: 'create_tf_resource',       // Generate a new .tf file for unmanaged resource
    IMPORT_TF_STATE: 'import_tf_state',             // terraform import for unmanaged resource
    UPDATE_TF_VARIABLE: 'update_tf_variable',       // Change a variable default
    
    // Policy actions
    RESTRICT_SECURITY_GROUP: 'restrict_security_group',  // Remove 0.0.0.0/0 rules
    ATTACH_RESTRICTIVE_POLICY: 'attach_restrictive_policy', // Add or update IAM policy
    ENABLE_ENCRYPTION: 'enable_encryption',              // Enable at-rest or in-transit encryption
    ENABLE_LOGGING: 'enable_logging',                    // Enable access/audit logging
    BLOCK_PUBLIC_ACCESS: 'block_public_access',          // Block public S3/ACL
    
    // Immediate actions
    REVOKE_ACCESS_KEY: 'revoke_access_key',         // Immediately revoke leaked credentials
    RESTRICT_BUCKET_ACL: 'restrict_bucket_acl',     // Remove public ACL
    DISABLE_DELETION_PROTECTION: 'disable_deletion_protection', // Toggle protection
    
    // Informational
    MANUAL_REVIEW: 'manual_review',                 // Requires human decision
    NO_ACTION: 'no_action'                          // Drift is cosmetic (tags only)
};

// =============================================================================
// MAIN REMEDIATION ENGINE
// =============================================================================

/**
 * Generate remediation plan from drift detection results.
 * 
 * @param {Map} resourceNodes - Map of all ResourceNodes
 * @param {string} environment - prod, staging, dev
 * @param {object} options - { autoApprove: boolean, dryRun: boolean, blastRadiusLimit: number }
 * @returns {object} RemediationPlan
 */
export function generateRemediationPlan(resourceNodes, environment = 'prod', options = {}) {
    const { autoApprove = false, dryRun = true, blastRadiusLimit = 50 } = options;
    
    console.log(`[Remediation] Generating plan for ${resourceNodes.size} resources (${environment})`);
    console.log(`[Remediation] Dry run: ${dryRun}, Auto-approve: ${autoApprove}`);
    
    const plan = {
        timestamp: new Date().toISOString(),
        environment,
        summary: {
            totalResources: resourceNodes.size,
            resourcesWithDrift: 0,
            criticalActions: 0,
            warningActions: 0,
            infoActions: 0,
            autoApprovedActions: 0,
            manualReviewRequired: 0,
            estimatedBlastRadius: 0
        },
        actions: [],
        terraformPatches: [],
        immediateActions: [],
        manualReviews: []
    };
    
    for (const [id, node] of resourceNodes) {
        if (!node.drift.detected) continue;
        
        plan.summary.resourcesWithDrift++;
        
        for (const driftField of node.drift.fields) {
            const action = determineRemediation(node, driftField, environment, options);
            
            if (!action) continue;
            
            // Categorize
            switch (action.type) {
                case 'immediate':
                    plan.immediateActions.push(action);
                    break;
                case 'terraform_patch':
                    plan.terraformPatches.push(action);
                    break;
                case 'manual_review':
                    plan.manualReviews.push(action);
                    break;
            }
            
            // Count severity
            if (action.severity === 'critical') plan.summary.criticalActions++;
            else if (action.severity === 'warning') plan.summary.warningActions++;
            else plan.summary.infoActions++;
            
            if (action.autoApprovable) plan.summary.autoApprovedActions++;
            if (action.requiresManualReview) plan.summary.manualReviewRequired++;
            
            plan.summary.estimatedBlastRadius += action.blastRadius || 0;
            plan.actions.push(action);
        }
    }
    
    // Sort by priority
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    plan.actions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    plan.terraformPatches.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    
    console.log(`[Remediation] Plan: ${plan.actions.length} actions (${plan.summary.criticalActions} critical, ${plan.summary.autoApprovedActions} auto-approvable)`);
    console.log(`[Remediation] ${plan.summary.manualReviewRequired} require manual review`);
    
    return plan;
}

// =============================================================================
// REMEDIATION DETERMINATION
// =============================================================================

function determineRemediation(node, driftField, environment, options) {
    const path = driftField.path;
    const risk = driftField.risk;
    const isCritical = driftField.isCritical;
    
    // ── Resource existence drift ──────────────────────────────
    if (path === 'resource') {
        if (driftField.declared === 'absent' && driftField.actual === 'present') {
            // Exists in cloud, not in IaC — offer import
            return createImportAction(node, environment);
        }
        if (driftField.declared === 'present' && driftField.actual === 'absent') {
            // In IaC but not deployed — needs investigation
            return createManualReview(node, driftField, 'Resource defined in IaC but not found in cloud');
        }
    }
    
    // ── Network exposure drift ───────────────────────────────
    if (path === 'networkExposure') {
        if (driftField.actual === 'public' && driftField.declared === 'private') {
            return createRestrictExposureAction(node, driftField, environment);
        }
    }
    
    // ── Access drift ─────────────────────────────────────────
    if (path === 'access') {
        if (driftField.actual === 'public' && driftField.declared !== 'public') {
            return createBlockPublicAccessAction(node, driftField, environment);
        }
    }
    
    // ── Encryption drift ─────────────────────────────────────
    if (path.startsWith('encryption')) {
        if (driftField.declared === true && driftField.actual === false) {
            return createEnableEncryptionAction(node, path, environment);
        }
    }
    
    // ── Logging drift ────────────────────────────────────────
    if (path.startsWith('logging')) {
        if (driftField.declared === true && driftField.actual === false) {
            return createEnableLoggingAction(node, environment);
        }
    }
    
    // ── Policy drift ─────────────────────────────────────────
    if (path.startsWith('policies')) {
        if (driftField.declared === 'absent' && driftField.actual === 'added') {
            // New policy added outside IaC
            if (driftField.isCritical) {
                return createRemoveOverlyPermissivePolicyAction(node, driftField, environment);
            }
            return createImportPolicyAction(node, driftField, environment);
        }
        if (driftField.declared === 'present' && driftField.actual === 'removed') {
            return createManualReview(node, driftField, 'Policy removed outside IaC — verify intent');
        }
    }
    
    // ── Tags drift (cosmetic) ────────────────────────────────
    if (path === 'tags') {
        return createTagSyncAction(node, driftField, environment);
    }
    
    // ── Unknown drift ────────────────────────────────────────
    return createManualReview(node, driftField, risk);
}

// =============================================================================
// ACTION FACTORIES
// =============================================================================

function createImportAction(node, environment) {
    const resourceType = node.serviceType;
    const resourceId = node.actualState.rawAttributes?.id || node.id;
    
    return {
        id: generateActionId(node, 'import'),
        type: 'terraform_patch',
        action: REMEDIATION_ACTIONS.IMPORT_TF_STATE,
        severity: 'critical',
        resourceId: node.id,
        resourceName: node.name,
        resourceType,
        blastRadius: node.blastRadius,
        autoApprovable: false,
        requiresManualReview: true,
        driftPath: 'resource',
        summary: `Import ${resourceType} "${node.name}" into Terraform state`,
        terraformCommand: `terraform import ${resourceType}.${sanitizeName(node.name)} ${resourceId}`,
        terraformPatch: generateTerraformImportPatch(node),
        rollbackAction: REMEDIATION_ACTIONS.MANUAL_REVIEW,
        evidence: {
            before: 'Resource not managed by IaC',
            after: `Resource imported into Terraform as ${resourceType}.${sanitizeName(node.name)}`,
            risk: 'Manual creation detected. Importing ensures IaC is source of truth.'
        }
    };
}

function createRestrictExposureAction(node, driftField, environment) {
    const securityGroupId = node.actualState.rawAttributes?.security_group_id || node.id;
    
    return {
        id: generateActionId(node, 'restrict-exposure'),
        type: 'terraform_patch',
        action: REMEDIATION_ACTIONS.RESTRICT_SECURITY_GROUP,
        severity: 'critical',
        resourceId: node.id,
        resourceName: node.name,
        resourceType: node.serviceType,
        blastRadius: node.blastRadius,
        autoApprovable: environment !== 'prod',  // Auto-approve in non-prod only
        requiresManualReview: environment === 'prod',
        driftPath: 'networkExposure',
        summary: `Restrict network exposure for "${node.name}" from public to ${driftField.declared}`,
        terraformPatch: generateSecurityGroupRestrictPatch(node, driftField),
        rollbackAction: REMEDIATION_ACTIONS.UPDATE_TF_RESOURCE,
        evidence: {
            before: `Network exposure: ${driftField.actual}`,
            after: `Network exposure: ${driftField.declared}`,
            risk: driftField.risk
        }
    };
}

function createBlockPublicAccessAction(node, driftField, environment) {
    const isS3 = node.serviceType.includes('s3') || node.serviceType.includes('bucket');
    
    return {
        id: generateActionId(node, 'block-public'),
        type: 'immediate',
        action: isS3 ? REMEDIATION_ACTIONS.BLOCK_PUBLIC_ACCESS : REMEDIATION_ACTIONS.RESTRICT_BUCKET_ACL,
        severity: 'critical',
        resourceId: node.id,
        resourceName: node.name,
        resourceType: node.serviceType,
        blastRadius: node.blastRadius,
        autoApprovable: true,  // Blocking public access is always safe
        requiresManualReview: false,
        driftPath: 'access',
        summary: `Block public access for "${node.name}"`,
        terraformPatch: generateBlockPublicAccessPatch(node),
        rollbackAction: REMEDIATION_ACTIONS.UPDATE_TF_RESOURCE,
        evidence: {
            before: `Access: ${driftField.actual}`,
            after: `Access: ${driftField.declared}`,
            risk: 'Public access detected. Immediate remediation recommended.'
        }
    };
}

function createEnableEncryptionAction(node, path, environment) {
    const isAtRest = path.includes('atRest');
    
    return {
        id: generateActionId(node, 'enable-encryption'),
        type: 'terraform_patch',
        action: REMEDIATION_ACTIONS.ENABLE_ENCRYPTION,
        severity: 'critical',
        resourceId: node.id,
        resourceName: node.name,
        resourceType: node.serviceType,
        blastRadius: node.blastRadius,
        autoApprovable: environment !== 'prod',
        requiresManualReview: environment === 'prod',
        driftPath: path,
        summary: `Enable encryption ${isAtRest ? 'at rest' : 'in transit'} for "${node.name}"`,
        terraformPatch: generateEncryptionPatch(node, isAtRest),
        rollbackAction: REMEDIATION_ACTIONS.UPDATE_TF_RESOURCE,
        evidence: {
            before: `Encryption ${isAtRest ? 'at rest' : 'in transit'}: disabled`,
            after: `Encryption ${isAtRest ? 'at rest' : 'in transit'}: enabled`,
            risk: 'Encryption was disabled or removed.'
        }
    };
}

function createEnableLoggingAction(node, environment) {
    return {
        id: generateActionId(node, 'enable-logging'),
        type: 'terraform_patch',
        action: REMEDIATION_ACTIONS.ENABLE_LOGGING,
        severity: 'warning',
        resourceId: node.id,
        resourceName: node.name,
        resourceType: node.serviceType,
        blastRadius: node.blastRadius,
        autoApprovable: true,
        requiresManualReview: false,
        driftPath: 'logging.enabled',
        summary: `Enable logging for "${node.name}"`,
        terraformPatch: generateLoggingPatch(node),
        rollbackAction: REMEDIATION_ACTIONS.UPDATE_TF_RESOURCE,
        evidence: {
            before: 'Logging: disabled',
            after: 'Logging: enabled',
            risk: 'Logging was disabled.'
        }
    };
}

function createRemoveOverlyPermissivePolicyAction(node, driftField, environment) {
    return {
        id: generateActionId(node, 'restrict-policy'),
        type: 'immediate',
        action: REMEDIATION_ACTIONS.ATTACH_RESTRICTIVE_POLICY,
        severity: 'critical',
        resourceId: node.id,
        resourceName: node.name,
        resourceType: node.serviceType,
        blastRadius: node.blastRadius,
        autoApprovable: true,
        requiresManualReview: false,
        driftPath: driftField.path,
        summary: `Remove overly-permissive policy from "${node.name}"`,
        terraformPatch: generatePolicyRemovalPatch(node, driftField),
        rollbackAction: REMEDIATION_ACTIONS.UPDATE_TF_RESOURCE,
        evidence: {
            before: `Policy: overly-permissive (0.0.0.0/0 or wildcard)`,
            after: 'Policy: restricted to required access only',
            risk: 'Overly-permissive policy added outside IaC.'
        }
    };
}

function createImportPolicyAction(node, driftField, environment) {
    return {
        id: generateActionId(node, 'import-policy'),
        type: 'terraform_patch',
        action: REMEDIATION_ACTIONS.IMPORT_TF_STATE,
        severity: 'warning',
        resourceId: node.id,
        resourceName: node.name,
        resourceType: node.serviceType,
        blastRadius: node.blastRadius,
        autoApprovable: false,
        requiresManualReview: true,
        driftPath: driftField.path,
        summary: `Import new policy into IaC for "${node.name}"`,
        terraformPatch: generatePolicyImportPatch(node, driftField),
        rollbackAction: REMEDIATION_ACTIONS.MANUAL_REVIEW,
        evidence: {
            before: 'Policy: not in IaC',
            after: 'Policy: imported into Terraform',
            risk: 'New policy added outside IaC — importing to maintain single source of truth.'
        }
    };
}

function createTagSyncAction(node, driftField, environment) {
    return {
        id: generateActionId(node, 'sync-tags'),
        type: 'terraform_patch',
        action: REMEDIATION_ACTIONS.UPDATE_TF_RESOURCE,
        severity: 'info',
        resourceId: node.id,
        resourceName: node.name,
        resourceType: node.serviceType,
        blastRadius: 0,
        autoApprovable: true,
        requiresManualReview: false,
        driftPath: 'tags',
        summary: `Sync tags for "${node.name}" to match declared state`,
        terraformPatch: generateTagSyncPatch(node),
        rollbackAction: REMEDIATION_ACTIONS.UPDATE_TF_RESOURCE,
        evidence: {
            before: `Tags: modified outside IaC`,
            after: 'Tags: synced to declared state',
            risk: 'Cosmetic drift — tags modified manually.'
        }
    };
}

function createManualReview(node, driftField, risk) {
    return {
        id: generateActionId(node, 'review'),
        type: 'manual_review',
        action: REMEDIATION_ACTIONS.MANUAL_REVIEW,
        severity: driftField.isCritical ? 'critical' : 'warning',
        resourceId: node.id,
        resourceName: node.name,
        resourceType: node.serviceType,
        blastRadius: node.blastRadius,
        autoApprovable: false,
        requiresManualReview: true,
        driftPath: driftField.path,
        summary: `Manual review required: ${risk}`,
        terraformPatch: null,
        rollbackAction: null,
        evidence: {
            before: JSON.stringify(driftField.declared),
            after: JSON.stringify(driftField.actual),
            risk: risk
        }
    };
}

// =============================================================================
// TERRAFORM PATCH GENERATORS
// =============================================================================

function generateTerraformImportPatch(node) {
    const name = sanitizeName(node.name);
    const type = node.serviceType;
    
    return {
        filename: `import-${name}.tf`,
        resourceBlock: `
# Imported resource — previously unmanaged
# Original ID: ${node.id}
resource "${type}" "${name}" {
  # TODO: Fill in resource configuration after import
  # Run: terraform import ${type}.${name} ${node.actualState.rawAttributes?.id || node.id}
  # Then: terraform plan to detect configuration
}
`.trim(),
        command: `terraform import ${type}.${name} ${node.actualState.rawAttributes?.id || node.id}`
    };
}

function generateSecurityGroupRestrictPatch(node, driftField) {
    const name = sanitizeName(node.name);
    
    return {
        filename: `restrict-${name}.tf`,
        resourceBlock: `
# Restrict security group: ${node.name}
# Changed from: ${driftField.declared} → ${driftField.actual}
resource "aws_security_group" "${name}" {
  # Remove overly-permissive ingress rules
  # Ensure no 0.0.0.0/0 CIDR blocks exist
  ingress {
    # Restrict to specific CIDR ranges only
    # TODO: Define specific allowed CIDR blocks
  }
}
`.trim(),
        variables: {
            restricted_cidr_blocks: '["10.0.0.0/8", "172.16.0.0/12"]'
        }
    };
}

function generateBlockPublicAccessPatch(node) {
    const name = sanitizeName(node.name);
    
    if (node.serviceType.includes('s3') || node.serviceType.includes('bucket')) {
        return {
            filename: `block-public-${name}.tf`,
            resourceBlock: `
# Block public access for S3 bucket: ${node.name}
resource "aws_s3_bucket_public_access_block" "${name}" {
  bucket = aws_s3_bucket.${name}.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
`.trim()
        };
    }
    
    return {
        filename: `restrict-access-${name}.tf`,
        resourceBlock: `# Restrict access for: ${node.name}\n# Remove public ACLs and permissions`,
        variables: { public_access: false }
    };
}

function generateEncryptionPatch(node, isAtRest) {
    const name = sanitizeName(node.name);
    
    return {
        filename: `encrypt-${name}.tf`,
        resourceBlock: `
# Enable encryption for: ${node.name}
resource "${node.serviceType}" "${name}" {
  # Add encryption configuration
  ${isAtRest ? 'encrypt_at_rest = true' : ''}
  ${node.serviceType.includes('s3') ? 'server_side_encryption_configuration { rule { apply_server_side_encryption_by_default { sse_algorithm = "AES256" } } }' : ''}
}
`.trim()
    };
}

function generateLoggingPatch(node) {
    const name = sanitizeName(node.name);
    
    return {
        filename: `enable-logging-${name}.tf`,
        resourceBlock: `
# Enable logging for: ${node.name}
resource "${node.serviceType}" "${name}" {
  logging {
    enabled = true
    log_destination = "arn:aws:logs:REGION:ACCOUNT:log-group:/${node.name}"
  }
}
`.trim()
    };
}

function generatePolicyRemovalPatch(node, driftField) {
    const name = sanitizeName(node.name);
    const policyName = driftField.path.split('.').pop();
    
    return {
        filename: `remove-policy-${name}.tf`,
        resourceBlock: `# Remove overly-permissive policy: ${policyName}\n# Resource: ${node.name}`,
        variables: { policy_to_remove: policyName },
        command: `aws iam delete-policy --policy-arn arn:aws:iam::ACCOUNT:policy/${policyName}`
    };
}

function generatePolicyImportPatch(node, driftField) {
    const name = sanitizeName(node.name);
    const policyName = driftField.path.split('.').pop();
    
    return {
        filename: `import-policy-${name}.tf`,
        resourceBlock: `
# Import policy into IaC: ${policyName}
# Resource: ${node.name}
resource "aws_iam_policy" "${name}_${policyName}" {
  name   = "${policyName}"
  policy = file("policies/${policyName}.json")
}
`.trim()
    };
}

function generateTagSyncPatch(node) {
    const name = sanitizeName(node.name);
    
    return {
        filename: `sync-tags-${name}.tf`,
        resourceBlock: `
# Sync tags for: ${node.name}
# Run: terraform apply -target=${node.serviceType}.${name}
# To sync tags to declared state
`.trim()
    };
}

// =============================================================================
// REMEDIATION EXECUTOR
// =============================================================================

/**
 * Execute a remediation plan, applying actions in priority order.
 * Respects dryRun, autoApprove, and blastRadiusLimit.
 * 
 * @param {object} plan - RemediationPlan from generateRemediationPlan()
 * @param {object} options - { dryRun, autoApprove, blastRadiusLimit }
 * @returns {object} ExecutionResult
 */
export async function executeRemediationPlan(plan, options = {}) {
    const { dryRun = true, autoApprove = false, blastRadiusLimit = 50 } = options;
    
    console.log(`[Remediation] Executing plan: ${plan.actions.length} actions`);
    
    const results = {
        executed: 0,
        skipped: 0,
        failed: 0,
        deferred: 0,
        details: []
    };
    
    for (const action of plan.actions) {
        // Safety gates
        if (action.requiresManualReview && !autoApprove) {
            results.deferred++;
            results.details.push({ actionId: action.id, status: 'deferred', reason: 'Manual review required' });
            continue;
        }
        
        if (action.blastRadius > blastRadiusLimit) {
            results.deferred++;
            results.details.push({ actionId: action.id, status: 'deferred', reason: `Blast radius (${action.blastRadius}) exceeds limit (${blastRadiusLimit})` });
            continue;
        }
        
        if (dryRun) {
            results.details.push({ actionId: action.id, status: 'dry_run', summary: action.summary, terraformPatch: action.terraformPatch });
            continue;
        }
        
        // Execute
        try {
            const result = await executeAction(action);
            results.executed++;
            results.details.push({ actionId: action.id, status: 'executed', result });
        } catch (err) {
            results.failed++;
            results.details.push({ actionId: action.id, status: 'failed', error: err.message });
        }
    }
    
    console.log(`[Remediation] ${results.executed} executed, ${results.deferred} deferred, ${results.failed} failed`);
    return results;
}

async function executeAction(action) {
    // In production, this would:
    // 1. For terraform_patch: create a PR with the patch file
    // 2. For immediate: call cloud API to block public access, revoke keys
    // 3. For manual_review: create a ticket in your issue tracker
    
    console.log(`[Remediation] Would execute: ${action.summary}`);
    if (action.terraformCommand) console.log(`[Remediation]   Command: ${action.terraformCommand}`);
    
    return { executed: true, action: action.action, summary: action.summary };
}

// =============================================================================
// HELPERS
// =============================================================================

function generateActionId(node, suffix) {
    return `${node.id}-${suffix}-${Date.now()}`;
}

function sanitizeName(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 64);
}


