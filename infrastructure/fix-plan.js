import fs from 'fs';
import path from 'path';

const file = 'state-manager.js';
let content = fs.readFileSync(file, 'utf-8');

// Fix savePlan: don't use safeId on the timestamp-based label
content = content.replace(
    /savePlan\(plan, label\) \{[\s\S]*?return fp;\s*\}/,
    `savePlan(plan, label) {
        ensureDir(path.join(this.basePath, 'plans'));
        const ts = label || new Date().toISOString().replace(/[:.]/g, '-');
        const fp = path.join(this.basePath, 'plans', 'plan-' + ts + '.json');
        fs.writeFileSync(fp, JSON.stringify(plan, null, 2));
        return fp;
    }`
);

// Fix loadPlan: just append .json to the label
content = content.replace(
    /loadPlan\(label\) \{[\s\S]*?return fs.existsSync\(fp\) \? JSON.parse\(fs.readFileSync\(fp, 'utf-8'\)\) : null;\s*\}/,
    `loadPlan(label) {
        const fp = path.join(this.basePath, 'plans', label + '.json');
        return fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, 'utf-8')) : null;
    }`
);

fs.writeFileSync(file, content);
console.log('Fixed savePlan and loadPlan');
