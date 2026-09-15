// ui-components.js
// Rankfixer Dashboard — React Component Library
// Consumes the /api/dashboard/summary contract.
// Zero external dependencies beyond React.

import React from 'react';

// =============================================================================
// SCORE GAUGE — SVG circular gauge, color-coded
// =============================================================================

export function ScoreGauge({ score = 0, size = 200, strokeWidth = 12 }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (score / 100) * circumference;
    
    const color = score >= 80 ? '#22c55e' :   // green
                  score >= 60 ? '#eab308' :   // yellow
                  '#ef4444';                  // red
    
    return (
        <div className="score-gauge" style={{ position: 'relative', width: size, height: size }}>
            <svg width={size} height={size}>
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth={strokeWidth}
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                />
            </svg>
            {/* Score text centered */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: size * 0.22, fontWeight: 700, color: '#111827', lineHeight: 1 }}>
                    {score}
                </div>
                <div style={{ fontSize: size * 0.08, color: '#6b7280', fontWeight: 500 }}>
                    /100
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// TREND INDICATOR — Arrow with delta
// =============================================================================

export function TrendIndicator({ trend = 0, label = 'stable' }) {
    const isPositive = trend > 0;
    const isNegative = trend < 0;
    const color = isPositive ? '#22c55e' : isNegative ? '#ef4444' : '#6b7280';
    const arrow = isPositive ? '▲' : isNegative ? '▼' : '◆';
    const text = isPositive ? `+${trend}` : isNegative ? `${trend}` : '—';
    const statusText = label === 'better' ? 'Better than yesterday' :
                       label === 'worse' ? 'Needs attention' :
                       'Holding steady';
    
    return (
        <div className="trend-indicator" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color, fontSize: 18, fontWeight: 700 }}>{arrow}</span>
            <span style={{ color, fontSize: 24, fontWeight: 700 }}>{text}</span>
            <span style={{ color: '#6b7280', fontSize: 14 }}>{statusText}</span>
        </div>
    );
}

// =============================================================================
// ACTIVITY CARD — Reusable receipt card
// =============================================================================

export function ActivityCard({ activity }) {
    const icons = {
        fixed: '✅',
        decision_required: '⚠️',
        detected: '🔍',
        rolled_back: '🔁',
        trend_alert: '📊'
    };
    
    const icon = icons[activity.type] || '📋';
    const isActionable = activity.type === 'decision_required';
    
    return (
        <div className="activity-card" style={{
            border: `1px solid ${isActionable ? '#f59e0b' : '#e5e7eb'}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 12,
            backgroundColor: isActionable ? '#fffbeb' : '#ffffff',
            borderLeft: `4px solid ${isActionable ? '#f59e0b' : '#22c55e'}`
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>
                        {activity.title}
                    </div>
                    {activity.subtitle && (
                        <div style={{ fontSize: 13, color: '#6b7280' }}>
                            {activity.subtitle}
                        </div>
                    )}
                </div>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>
                    {formatTimestamp(activity.timestamp)}
                </span>
            </div>
            
            {/* Before/After — only for fixed type */}
            {activity.type === 'fixed' && (
                <div style={{
                    backgroundColor: '#f9fafb',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 12,
                    fontSize: 13
                }}>
                    <div style={{ color: '#ef4444', marginBottom: 4 }}>
                        <strong>Before:</strong> {activity.beforeState || activity.risk}
                    </div>
                    <div style={{ color: '#22c55e' }}>
                        <strong>After:</strong> {activity.afterState || 'Fixed'}
                    </div>
                </div>
            )}
            
            {/* Risk warning — for decision_required type */}
            {activity.type === 'decision_required' && (
                <div style={{
                    backgroundColor: '#fef3c7',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 12,
                    fontSize: 13,
                    color: '#92400e'
                }}>
                    <strong>Risk:</strong> {activity.risk}
                    {activity.blastRadius > 0 && (
                        <span> • Affects {activity.blastRadius} {activity.blastRadiusLabel || 'resources'}</span>
                    )}
                    <br />
                    <strong>Recommended:</strong> {activity.recommendation}
                </div>
            )}
            
            {/* Footer — metadata */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280' }}>
                    {activity.affectedCount > 0 && (
                        <span>📄 {activity.affectedCount} {activity.affectedLabel || 'pages'}</span>
                    )}
                    {activity.executionTime && (
                        <span>⏱ {activity.executionTime}</span>
                    )}
                    {activity.reversible && (
                        <span style={{ color: '#22c55e' }}>🔁 Reversible</span>
                    )}
                </div>
                
                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                    {activity.type === 'decision_required' ? (
                        <>
                            <button style={approveButtonStyle}>Approve fix</button>
                            <button style={dismissButtonStyle}>Dismiss</button>
                        </>
                    ) : (
                        <button style={detailButtonStyle}>See details</button>
                    )}
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// EXECUTIVE SUMMARY — The three-sentence hook
// =============================================================================

export function ExecutiveSummary({ summary, stats }) {
    return (
        <div className="executive-summary" style={{ padding: 20 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
                {summary.headline}
            </h2>
            <p style={{ fontSize: 15, color: '#374151', marginBottom: 4 }}>
                {summary.subtext}
            </p>
            <p style={{ fontSize: 15, color: summary.callToAction.includes('attention') ? '#d97706' : '#22c55e', fontWeight: 500 }}>
                {summary.callToAction}
            </p>
            
            {/* Mini stats row */}
            <div style={{ display: 'flex', gap: 24, marginTop: 16, padding: 12, backgroundColor: '#f9fafb', borderRadius: 8 }}>
                <MiniStat label="Auto-fixed" value={stats.autoFixedSinceLast} />
                <MiniStat label="Hours saved" value={stats.manualHoursSaved} suffix="h" />
                <MiniStat label="Pending" value={stats.pendingDecisions} warn={stats.pendingDecisions > 0} />
                <MiniStat label="Regressions" value={stats.regressionsDetected} warn={stats.regressionsDetected > 0} />
            </div>
            
            {/* Audit metadata */}
            {summary.lastAuditDate && (
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
                    Last audit: {formatTimestamp(summary.lastAuditDate)}
                    {summary.auditDuration && ` • Completed in ${summary.auditDuration}`}
                </div>
            )}
        </div>
    );
}

function MiniStat({ label, value, suffix = '', warn = false }) {
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ 
                fontSize: 20, 
                fontWeight: 700, 
                color: warn ? '#d97706' : '#111827' 
            }}>
                {value}{suffix}
            </div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{label}</div>
        </div>
    );
}

// =============================================================================
// HEALTH TREND — Mini sparkline
// =============================================================================

export function HealthTrend({ data = [] }) {
    if (data.length < 2) return null;
    
    const maxScore = 100;
    const minScore = Math.min(...data.map(d => d.overall), 60);
    const range = maxScore - minScore;
    
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((d.overall - minScore) / range) * 100;
        return `${x},${y}`;
    }).join(' ');
    
    const firstScore = data[0].overall;
    const lastScore = data[data.length - 1].overall;
    const isUp = lastScore >= firstScore;
    
    return (
        <div className="health-trend" style={{ padding: 12 }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                30-day trend
            </div>
            <svg width="100%" height="60" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polyline
                    points={points}
                    fill="none"
                    stroke={isUp ? '#22c55e' : '#ef4444'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af' }}>
                <span>{data[0].date}</span>
                <span>{data[data.length - 1].date}</span>
            </div>
        </div>
    );
}

// =============================================================================
// DOMAIN BREAKDOWN — Per-domain health bars
// =============================================================================

export function DomainBreakdown({ domains = [] }) {
    return (
        <div className="domain-breakdown" style={{ padding: 12 }}>
            {domains.map(domain => (
                <div key={domain.name} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
                            {domain.name}
                        </span>
                        <span style={{ 
                            fontSize: 14, 
                            fontWeight: 600,
                            color: domain.status === 'healthy' ? '#22c55e' : 
                                   domain.status === 'warning' ? '#eab308' : '#ef4444'
                        }}>
                            {domain.score ?? '—'}
                            {domain.trend !== 0 && (
                                <span style={{ fontSize: 11, marginLeft: 4 }}>
                                    {domain.trend > 0 ? '▲' : '▼'} {Math.abs(domain.trend)}
                                </span>
                            )}
                        </span>
                    </div>
                    <div style={{ 
                        height: 6, 
                        backgroundColor: '#e5e7eb', 
                        borderRadius: 3,
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${domain.score || 0}%`,
                            backgroundColor: (domain.score || 0) >= 80 ? '#22c55e' : 
                                            (domain.score || 0) >= 60 ? '#eab308' : '#ef4444',
                            borderRadius: 3,
                            transition: 'width 1s ease-in-out'
                        }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

// =============================================================================
// GOVERNANCE TOGGLE — Auto-Pilot / Co-Pilot
// =============================================================================

export function GovernanceToggle({ governance, onChange }) {
    const isAuto = governance.mode === 'auto-pilot';
    
    return (
        <div className="governance-toggle" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            backgroundColor: '#f9fafb',
            borderRadius: 12,
            border: '1px solid #e5e7eb'
        }}>
            <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>
                    {isAuto ? '🟢 Auto-Pilot' : '🟡 Co-Pilot'}
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                    {isAuto 
                        ? 'Minor fixes applied automatically. Critical issues flagged for review.'
                        : 'All fixes held for your approval before execution.'
                    }
                </div>
            </div>
            
            {/* Toggle switch */}
            <div 
                onClick={() => onChange(!isAuto)}
                style={{
                    width: 52,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: isAuto ? '#22c55e' : '#d1d5db',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                }}
            >
                <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: '#ffffff',
                    position: 'absolute',
                    top: 2,
                    left: isAuto ? 26 : 2,
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
            </div>
        </div>
    );
}

// =============================================================================
// ONE-SCREEN DASHBOARD — Composes all components
// =============================================================================

export function Dashboard({ data }) {
    if (!data) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>;
    
    const { health, executiveSummary, stats, activityFeed, healthTrend, governanceStatus } = data;
    
    return (
        <div className="dashboard" style={{
            maxWidth: 960,
            margin: '0 auto',
            padding: 24,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
        }}>
            {/* Top row: Score + Summary */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '280px 1fr',
                gap: 24,
                marginBottom: 32
            }}>
                {/* Left: Score gauge */}
                <div style={{ textAlign: 'center' }}>
                    <ScoreGauge score={health.overall} />
                    <div style={{ marginTop: 16 }}>
                        <TrendIndicator trend={health.trend} label={health.trendLabel} />
                    </div>
                    <div style={{ marginTop: 16 }}>
                        <GovernanceToggle governance={governanceStatus} />
                    </div>
                </div>
                
                {/* Right: Summary + domain breakdown */}
                <div>
                    <ExecutiveSummary summary={executiveSummary} stats={stats} />
                    <DomainBreakdown domains={health.domains} />
                    <HealthTrend data={healthTrend} />
                </div>
            </div>
            
            {/* Bottom: Activity feed */}
            <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 16 }}>
                    Activity Feed
                </h3>
                {activityFeed.length === 0 ? (
                    <div style={{ 
                        padding: 40, 
                        textAlign: 'center', 
                        color: '#6b7280',
                        backgroundColor: '#f9fafb',
                        borderRadius: 12
                    }}>
                        No activity yet. Run your first audit to see results.
                    </div>
                ) : (
                    activityFeed.map(activity => (
                        <ActivityCard key={activity.id} activity={activity} />
                    ))
                )}
            </div>
        </div>
    );
}

// =============================================================================
// STYLES
// =============================================================================

const approveButtonStyle = {
    padding: '8px 16px',
    backgroundColor: '#1d4ed8',
    color: '#ffffff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer'
};

const dismissButtonStyle = {
    padding: '8px 16px',
    backgroundColor: '#ffffff',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer'
};

const detailButtonStyle = {
    padding: '8px 16px',
    backgroundColor: '#ffffff',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer'
};

// =============================================================================
// HELPERS
// =============================================================================

function formatTimestamp(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// =============================================================================
// EXPORTS
// =============================================================================

export { ScoreGauge, TrendIndicator, ActivityCard, ExecutiveSummary, HealthTrend, DomainBreakdown, GovernanceToggle, Dashboard };
