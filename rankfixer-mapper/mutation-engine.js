// mutation-engine.js
// Surgical DOM manipulation engine for Hermes
// Uses a "Probe-and-Patch" strategy: verify context, apply fix, verify result.

import { JSDOM } from 'jsdom';  // Server-side DOM parser
// import puppeteer from 'puppeteer';  // For JS-rendered pages

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Apply a DOM mutation to a page.
 * 
 * @param {string} url - The page URL
 * @param {object} instruction - Fix instruction from buildFixInstruction()
 * @param {object} options - { dryRun: boolean, captureState: boolean }
 * @returns {object} { success, beforeState, afterState, error }
 */
export async function applyDOMMutation(url, instruction, options = {}) {
    const { dryRun = false, captureState = true } = options;
    
    console.log(`[Mutation] ${instruction.action} on ${url}${dryRun ? ' (DRY RUN)' : ''}`);
    
    try {
        // Step 1: Fetch the current page DOM
        const dom = await fetchPageDOM(url);
        const document = dom.window.document;
        
        // Step 2: Capture before state for audit trail
        let beforeState = null;
        if (captureState) {
            beforeState = captureBeforeState(document, instruction);
        }
        
        // Step 3: Verify the DOM context matches expectations
        const contextCheck = verifyMutationContext(document, instruction);
        if (!contextCheck.valid) {
            return { 
                success: false, 
                error: `Context check failed: ${contextCheck.reason}`,
                beforeState 
            };
        }
        
        // Step 4: Execute the mutation
        let result;
        switch (instruction.action) {
            case 'add_element':
                result = handleAddElement(document, instruction);
                break;
            case 'add_meta_tag':
                result = handleAddMetaTag(document, instruction);
                break;
            case 'update_title_template':
                result = handleUpdateTitle(document, instruction);
                break;
            case 'update_meta_template':
                result = handleUpdateMeta(document, instruction);
                break;
            case 'add_link_tag':
                result = handleAddLink(document, instruction);
                break;
            case 'update_canonical_target':
                result = handleUpdateCanonical(document, instruction);
                break;
            case 'break_reciprocal_canonical':
                result = handleBreakReciprocalCanonical(document, instruction);
                break;
            case 'update_h1':
                result = handleUpdateH1(document, instruction);
                break;
            case 'consolidate_h1':
                result = handleConsolidateH1(document, instruction);
                break;
            default:
                return { success: false, error: `Unknown action: ${instruction.action}`, beforeState };
        }
        
        if (!result.success) {
            return { ...result, beforeState };
        }
        
        // Step 5: Capture after state
        let afterState = null;
        if (captureState) {
            afterState = captureAfterState(document, instruction, beforeState);
        }
        
        // Step 6: Serialize the modified DOM
        const modifiedHTML = dom.serialize();
        
        // Step 7: If not dry run, persist the changes
        if (!dryRun) {
            await persistChanges(url, modifiedHTML, instruction);
        }
        
        return {
            success: true,
            beforeState,
            afterState,
            modifiedHTML: dryRun ? modifiedHTML : null,
            changes: result.changes
        };
        
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// =============================================================================
// MUTATION HANDLERS — Each implements Probe-and-Patch
// =============================================================================

/**
 * Add an element to the DOM (e.g., add <h1> to a template).
 * Idempotent: checks if element already exists before adding.
 */
function handleAddElement(document, instruction) {
    const { selector, element, placement = 'prepend' } = instruction;
    
    // Probe: Check if target container exists
    const container = document.querySelector(selector);
    if (!container) {
        return { success: false, error: `Container not found: ${selector}` };
    }
    
    // Probe: Check if element already exists (idempotency)
    const tagName = element.match(/<(\w+)/)?.[1];
    if (tagName) {
        const existing = container.querySelector(tagName);
        if (existing) {
            return { 
                success: true, 
                changes: { action: 'skipped', reason: `Element <${tagName}> already exists in ${selector}` } 
            };
        }
    }
    
    // Patch: Insert the element
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = element.trim();
    const newElement = tempDiv.firstChild;
    
    if (placement === 'prepend') {
        container.insertBefore(newElement, container.firstChild);
    } else if (placement === 'append') {
        container.appendChild(newElement);
    } else if (placement === 'replace') {
        // Replace the container's content with the new element
        while (container.firstChild) container.removeChild(container.firstChild);
        container.appendChild(newElement);
    }
    
    return { 
        success: true, 
        changes: { action: 'added', element: tagName, selector, placement } 
    };
}

/**
 * Add or update a <meta> tag.
 * Idempotent: updates existing tag instead of creating duplicate.
 */
function handleAddMetaTag(document, instruction) {
    const { tag, attributes } = instruction;
    
    // Probe: Check if meta tag already exists
    const existingQuery = Object.entries(attributes)
        .map(([key, value]) => `[${key}="${value.replace(/"/g, '\\"')}"]`)
        .join('');
    
    // More specific: check by name attribute
    const nameAttr = attributes.name;
    let existing = null;
    
    if (nameAttr) {
        existing = document.querySelector(`meta[name="${nameAttr}"]`);
    } else {
        existing = document.querySelector(`meta${existingQuery}`);
    }
    
    if (existing) {
        // Patch: Update existing — don't duplicate
        const before = existing.getAttribute('content') || existing.outerHTML;
        for (const [key, value] of Object.entries(attributes)) {
            existing.setAttribute(key, value);
        }
        return { 
            success: true, 
            changes: { action: 'updated', metaName: nameAttr, before, after: existing.outerHTML } 
        };
    }
    
    // Patch: Create new meta tag
    const meta = document.createElement('meta');
    for (const [key, value] of Object.entries(attributes)) {
        meta.setAttribute(key, value);
    }
    document.head.appendChild(meta);
    
    return { 
        success: true, 
        changes: { action: 'created', metaName: nameAttr, element: meta.outerHTML } 
    };
}

/**
 * Update the <title> tag template.
 * Stores original title for rollback.
 */
function handleUpdateTitle(document, instruction) {
    const { current, recommended } = instruction;
    
    // Probe: Find title tag
    const titleTag = document.querySelector('title');
    if (!titleTag) {
        // Create title if missing
        const newTitle = document.createElement('title');
        newTitle.textContent = recommended;
        document.head.appendChild(newTitle);
        return { 
            success: true, 
            changes: { action: 'created', before: null, after: recommended } 
        };
    }
    
    const before = titleTag.textContent;
    
    // Only update if it matches the expected current pattern
    if (current && !before.toLowerCase().includes(current.toLowerCase())) {
        return { 
            success: false, 
            error: `Title does not match expected pattern. Expected: "${current}", Found: "${before}"` 
        };
    }
    
    // Patch: Update title
    if (current) {
        titleTag.textContent = before.replace(new RegExp(current.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), recommended);
    } else {
        titleTag.textContent = recommended;
    }
    
    return { 
        success: true, 
        changes: { action: 'updated', before, after: titleTag.textContent } 
    };
}

/**
 * Update meta description content.
 */
function handleUpdateMeta(document, instruction) {
    const { current, recommended } = instruction;
    
    // Probe: Find meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
        return { success: false, error: 'Meta description tag not found' };
    }
    
    const before = metaDesc.getAttribute('content');
    
    // Patch: Update content
    metaDesc.setAttribute('content', recommended);
    
    return { 
        success: true, 
        changes: { action: 'updated', before, after: recommended } 
    };
}

/**
 * Add a <link> tag (canonical, etc).
 * Idempotent: removes existing rel before adding new one.
 */
function handleAddLink(document, instruction) {
    const { rel, href } = instruction;
    
    // Probe: Check for existing link with same rel
    const existing = document.querySelector(`link[rel="${rel}"]`);
    
    if (existing) {
        // Idempotent: if same href, skip
        if (existing.getAttribute('href') === href) {
            return { 
                success: true, 
                changes: { action: 'skipped', reason: `Canonical already points to ${href}` } 
            };
        }
        
        const before = existing.getAttribute('href');
        
        // Patch: Update existing
        existing.setAttribute('href', href);
        return { 
            success: true, 
            changes: { action: 'updated', before, after: href } 
        };
    }
    
    // Patch: Create new link tag
    const link = document.createElement('link');
    link.setAttribute('rel', rel);
    link.setAttribute('href', href);
    document.head.appendChild(link);
    
    return { 
        success: true, 
        changes: { action: 'created', rel, href } 
    };
}

/**
 * Update canonical URL target.
 */
function handleUpdateCanonical(document, instruction) {
    const { current, recommended } = instruction;
    
    const canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        // No canonical exists — add one
        const link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        link.setAttribute('href', recommended);
        document.head.appendChild(link);
        return { 
            success: true, 
            changes: { action: 'created', href: recommended } 
        };
    }
    
    const before = canonical.getAttribute('href');
    
    // Verify it matches the expected current target
    if (current && before !== current) {
        return { 
            success: false, 
            error: `Canonical target mismatch. Expected: ${current}, Found: ${before}` 
        };
    }
    
    canonical.setAttribute('href', recommended);
    return { 
        success: true, 
        changes: { action: 'updated', before, after: recommended } 
    };
}

/**
 * Break a reciprocal canonical by removing the canonical from one page.
 */
function handleBreakReciprocalCanonical(document, instruction) {
    // This requires context about which side of the reciprocal to break.
    // For safety, we remove the canonical from the current page
    // and let the other page be the canonical target.
    
    const canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        return { success: true, changes: { action: 'skipped', reason: 'No canonical to remove' } };
    }
    
    const before = canonical.getAttribute('href');
    canonical.remove();
    
    return { 
        success: true, 
        changes: { action: 'removed', before, after: 'self-canonical (implicit)' } 
    };
}

/**
 * Update H1 text content.
 */
function handleUpdateH1(document, instruction) {
    const { current, recommended } = instruction;
    
    const h1 = document.querySelector('h1');
    if (!h1) {
        return { success: false, error: 'H1 tag not found — use add_element instead' };
    }
    
    const before = h1.textContent.trim();
    
    if (current && before.toLowerCase() !== current.toLowerCase()) {
        return { 
            success: false, 
            error: `H1 text mismatch. Expected: "${current}", Found: "${before}"` 
        };
    }
    
    h1.textContent = recommended;
    
    return { 
        success: true, 
        changes: { action: 'updated', before, after: recommended } 
    };
}

/**
 * Consolidate multiple H1s into one primary H1 + H2s.
 */
function handleConsolidateH1(document, instruction) {
    const h1s = document.querySelectorAll('h1');
    
    if (h1s.length <= 1) {
        return { success: true, changes: { action: 'skipped', reason: 'Only one H1 exists' } };
    }
    
    const before = Array.from(h1s).map(h => h.textContent.trim());
    
    // Keep the first H1, convert the rest to H2
    for (let i = 1; i < h1s.length; i++) {
        const h2 = document.createElement('h2');
        h2.innerHTML = h1s[i].innerHTML;
        // Copy attributes except id (to avoid duplicates)
        for (const attr of h1s[i].attributes) {
            if (attr.name !== 'id') h2.setAttribute(attr.name, attr.value);
        }
        h1s[i].parentNode.replaceChild(h2, h1s[i]);
    }
    
    return { 
        success: true, 
        changes: { action: 'consolidated', before, after: `1 H1 + ${h1s.length - 1} H2s` } 
    };
}

// =============================================================================
// CONTEXT VERIFICATION — "Probe" phase
// =============================================================================

/**
 * Verify the DOM context matches what we expect before mutating.
 * Prevents fixes from being applied to the wrong page or wrong element.
 */
function verifyMutationContext(document, instruction) {
    const action = instruction.action;
    
    switch (action) {
        case 'add_element': {
            const container = document.querySelector(instruction.selector);
            if (!container) {
                return { valid: false, reason: `Container "${instruction.selector}" not found in DOM` };
            }
            return { valid: true };
        }
        
        case 'add_meta_tag': {
            const head = document.querySelector('head');
            if (!head) {
                return { valid: false, reason: 'No <head> element found — malformed document' };
            }
            return { valid: true };
        }
        
        case 'update_title_template':
        case 'update_meta_template': {
            const title = document.querySelector('title');
            if (!title && action === 'update_title_template') {
                return { valid: false, reason: 'No <title> tag found' };
            }
            return { valid: true };
        }
        
        case 'add_link_tag':
        case 'update_canonical_target':
        case 'break_reciprocal_canonical': {
            const head = document.querySelector('head');
            if (!head) {
                return { valid: false, reason: 'No <head> element found' };
            }
            return { valid: true };
        }
        
        case 'update_h1':
        case 'consolidate_h1': {
            const h1 = document.querySelector('h1');
            if (!h1 && action === 'update_h1') {
                return { valid: false, reason: 'No H1 tag found — nothing to update' };
            }
            return { valid: true };
        }
        
        default:
            return { valid: false, reason: `Unknown action: ${action}` };
    }
}

// =============================================================================
// STATE CAPTURE — Audit trail for rollback
// =============================================================================

/**
 * Capture the DOM state before a mutation.
 */
function captureBeforeState(document, instruction) {
    const state = {
        action: instruction.action,
        timestamp: new Date().toISOString(),
        elements: {}
    };
    
    switch (instruction.action) {
        case 'add_meta_tag': {
            const name = instruction.attributes?.name;
            if (name) {
                const existing = document.querySelector(`meta[name="${name}"]`);
                state.elements.meta = existing ? existing.outerHTML : null;
            }
            break;
        }
        case 'update_title_template': {
            const title = document.querySelector('title');
            state.elements.title = title ? title.textContent : null;
            break;
        }
        case 'update_meta_template': {
            const meta = document.querySelector('meta[name="description"]');
            state.elements.metaDescription = meta ? meta.getAttribute('content') : null;
            break;
        }
        case 'add_link_tag':
        case 'update_canonical_target': {
            const canonical = document.querySelector('link[rel="canonical"]');
            state.elements.canonical = canonical ? canonical.getAttribute('href') : null;
            break;
        }
        case 'break_reciprocal_canonical': {
            const canonical = document.querySelector('link[rel="canonical"]');
            state.elements.canonical = canonical ? { href: canonical.getAttribute('href'), exists: true } : { exists: false };
            break;
        }
        case 'add_element': {
            const container = document.querySelector(instruction.selector);
            state.elements.containerHTML = container ? container.innerHTML.substring(0, 500) : null;
            break;
        }
        case 'update_h1':
        case 'consolidate_h1': {
            const h1s = document.querySelectorAll('h1');
            state.elements.h1s = Array.from(h1s).map(h => ({ text: h.textContent.trim(), html: h.innerHTML.substring(0, 200) }));
            break;
        }
    }
    
    return state;
}

/**
 * Capture the DOM state after a mutation.
 */
function captureAfterState(document, instruction, beforeState) {
    const state = {
        action: instruction.action,
        timestamp: new Date().toISOString(),
        elements: {}
    };
    
    // Mirror the same captures as beforeState for diff comparison
    switch (instruction.action) {
        case 'add_meta_tag': {
            const name = instruction.attributes?.name;
            if (name) {
                const meta = document.querySelector(`meta[name="${name}"]`);
                state.elements.meta = meta ? meta.outerHTML : null;
            }
            break;
        }
        case 'update_title_template': {
            const title = document.querySelector('title');
            state.elements.title = title ? title.textContent : null;
            break;
        }
        case 'update_meta_template': {
            const meta = document.querySelector('meta[name="description"]');
            state.elements.metaDescription = meta ? meta.getAttribute('content') : null;
            break;
        }
        case 'add_link_tag':
        case 'update_canonical_target': {
            const canonical = document.querySelector('link[rel="canonical"]');
            state.elements.canonical = canonical ? canonical.getAttribute('href') : null;
            break;
        }
        case 'break_reciprocal_canonical': {
            const canonical = document.querySelector('link[rel="canonical"]');
            state.elements.canonical = canonical ? { href: canonical.getAttribute('href'), exists: true } : { exists: false };
            break;
        }
        case 'add_element': {
            const container = document.querySelector(instruction.selector);
            state.elements.containerHTML = container ? container.innerHTML.substring(0, 500) : null;
            break;
        }
        case 'update_h1':
        case 'consolidate_h1': {
            const h1s = document.querySelectorAll('h1');
            state.elements.h1s = Array.from(h1s).map(h => ({ text: h.textContent.trim() }));
            break;
        }
    }
    
    return state;
}

// =============================================================================
// ROLLBACK PROTOCOL
// =============================================================================

/**
 * Rollback a previously applied mutation.
 * Uses the stored beforeState to restore the original DOM.
 */
export async function rollbackMutation(url, instruction, beforeState) {
    console.log(`[Mutation] ROLLBACK ${instruction.action} on ${url}`);
    
    try {
        const dom = await fetchPageDOM(url);
        const document = dom.window.document;
        
        let result;
        
        switch (instruction.action) {
            case 'add_meta_tag': {
                const name = instruction.attributes?.name;
                const meta = document.querySelector(`meta[name="${name}"]`);
                if (beforeState.elements.meta === null && meta) {
                    meta.remove();
                    result = { action: 'removed' };
                } else if (beforeState.elements.meta && meta) {
                    // Restore original attributes
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = beforeState.elements.meta;
                    const original = tempDiv.firstChild;
                    for (const attr of original.attributes) {
                        meta.setAttribute(attr.name, attr.value);
                    }
                    result = { action: 'restored' };
                }
                break;
            }
            case 'update_title_template': {
                const title = document.querySelector('title');
                if (title && beforeState.elements.title !== null) {
                    title.textContent = beforeState.elements.title;
                    result = { action: 'restored' };
                }
                break;
            }
            case 'add_link_tag':
            case 'update_canonical_target': {
                const canonical = document.querySelector('link[rel="canonical"]');
                if (beforeState.elements.canonical === null && canonical) {
                    canonical.remove();
                    result = { action: 'removed' };
                } else if (beforeState.elements.canonical && canonical) {
                    canonical.setAttribute('href', beforeState.elements.canonical);
                    result = { action: 'restored' };
                }
                break;
            }
            case 'break_reciprocal_canonical': {
                if (beforeState.elements.canonical?.exists) {
                    const link = document.createElement('link');
                    link.setAttribute('rel', 'canonical');
                    link.setAttribute('href', beforeState.elements.canonical.href);
                    document.head.appendChild(link);
                    result = { action: 'restored' };
                }
                break;
            }
            default: {
                return { success: false, error: `Rollback not supported for: ${instruction.action}` };
            }
        }
        
        const modifiedHTML = dom.serialize();
        await persistChanges(url, modifiedHTML, instruction);
        
        return { success: true, result };
        
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Fetch a page and parse it into a JSDOM document.
 */
async function fetchPageDOM(url) {
    const response = await fetch(url, {
        headers: { 'User-Agent': 'Hermes/1.0 (SEO Auto-Fix)' }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    
    const html = await response.text();
    return new JSDOM(html, { url });
}

/**
 * Persist changes back to the site.
 * In production, this would write to the CMS, file system, or database.
 */
async function persistChanges(url, modifiedHTML, instruction) {
    // Placeholder: In production, this would:
    // 1. Write to CMS via API (WordPress REST API, Shopify Admin API, etc.)
    // 2. Or write to a static file if it's a static site
    // 3. Or update the database if it's a database-driven site
    
    console.log(`[Mutation] Persisting changes to ${url} (${instruction.action})`);
    console.log(`[Mutation] Modified HTML length: ${modifiedHTML.length} chars`);
    
    // For now, log the change. In production, replace with actual persistence.
    return true;
}

export { applyDOMMutation, rollbackMutation, verifyMutationContext };
