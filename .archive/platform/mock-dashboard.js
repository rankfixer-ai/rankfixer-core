// mock-dashboard.js
// Rankfixer Platform — Mock Dashboard Data
// Simulates /api/dashboard/summary for development and demo.
// Replace with real API call in production.

import React, { useState, useEffect } from 'react';
import { Dashboard } from './ui-components.js';

// =============================================================================
// MOCK API — Simulates the real /api/dashboard/summary response
// =============================================================================

const MOCK_RESPONSE = {
    health: {
        overall: 78,
        trend: 3,
        trendLabel: "better",
        domains: [
            { name: "SEO", score: 82, trend: 2, status: "healthy" },
            { name: "Infrastructure", score: 74, trend: 5, status: "warning" },
            { name: "GEO Citation", score: 67, trend: 0, status: "new" }
        ]
    },
    executiveSummary: {
        headline: "You're better than yesterday.",
        subtext: "3 critical issues were fixed automatically.",
        callToAction: "1 decision needs your attention.",
        lastAuditDate: "2026-07-03T14:10:29Z",
        auditDuration: "68.6s"
    },
    stats: {
        totalAssets: 2333,
        autoFixedSinceLast: 12,
        pendingDecisions: 1,
        regressionsDetected: 0,
        manualHoursSaved: 4.5,
        driftIncidentsPrevented: 12
    },
    activityFeed: [
        {
            id: "act-001",
            timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            type: "fixed",
            icon: "seo",
            title: "Repaired 4 broken canonical URLs",
            subtitle: "across your product template",
            beforeState: "4 product pages pointing to dead canonical targets, wasting crawl budget",
            afterState: "All canonicals self-referencing correctly. Indexing signals restored.",
            affectedCount: 243,
            affectedLabel: "product pages",
            executionTime: "3.2s",
            reversible: true
        },
        {
            id: "act-002",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
            type: "decision_required",
            icon: "security",
            title: "Production firewall rule opened port 22",
            subtitle: "to the internet on api-server-prod",
            risk: "SSH exposed to 0.0.0.0/0",
            blastRadius: 12,
            blastRadiusLabel: "dependent resources",
            recommendation: "Restrict to internal VPC only"
        },
        {
            id: "act-003",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
            type: "fixed",
            icon: "security",
            title: "Blocked public access on S3 bucket",
            subtitle: "company-logs-prod was publicly readable",
            beforeState: "Bucket ACL set to public-read. 12,400 objects exposed.",
            afterState: "Public access blocked. Bucket is now private. Encryption enabled.",
            affectedCount: 1,
            affectedLabel: "bucket",
            executionTime: "1.1s",
            reversible: true
        },
        {
            id: "act-004",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
            type: "fixed",
            icon: "seo",
            title: "Added missing meta descriptions",
            subtitle: "to collection template",
            beforeState: "1,053 collection pages had no meta description",
            afterState: "Template updated with dynamic meta description. All pages covered.",
            affectedCount: 1053,
            affectedLabel: "collection pages",
            executionTime: "2.8s",
            reversible: true
        },
        {
            id: "act-005",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            type: "detected",
            icon: "geo",
            title: "Citation gap detected vs competitors",
            subtitle: "on product pages for 'sustainable running shoes'",
            risk: "Your CWS is 0.42 vs competitor avg 0.71. AI likely to cite competitors instead.",
            recommendation: "Add 3-4 cited statistics per page with inline source attribution",
            affectedCount: 484,
            affectedLabel: "product pages"
        },
        {
            id: "act-006",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
            type: "fixed",
            icon: "seo",
            title: "Consolidated multiple H1 tags",
            subtitle: "across 15 individual pages",
            beforeState: "Pages had 2-5 H1 tags each, confusing search engines",
            afterState: "Each page now has exactly one H1. Heading hierarchy restored.",
            affectedCount: 15,
            affectedLabel: "pages",
            executionTime: "4.1s",
            reversible: true
        }
    ],
    healthTrend: [
        { date: "2026-06-28", overall: 72 },
        { date: "2026-06-30", overall: 75 },
        { date: "2026-07-01", overall: 74 },
        { date: "2026-07-02", overall: 76 },
        { date: "2026-07-03", overall: 78 }
    ],
    governanceStatus: {
        mode: "auto-pilot",
        autoFixEnabled: true,
        pendingApprovalCount: 1,
        profileName: "Standard"
    }
};

// =============================================================================
// MOCK DASHBOARD APP — Drop-in replacement for real API during development
// =============================================================================

export function MockDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        // Simulate API call latency
        const timer = setTimeout(() => {
            setData(MOCK_RESPONSE);
            setLoading(false);
        }, 800);
        return () => clearTimeout(timer);
    }, []);
    
    // Governance toggle handler
    const handleGovernanceChange = (isAuto) => {
        setData(prev => ({
            ...prev,
            governanceStatus: {
                ...prev.governanceStatus,
                mode: isAuto ? 'auto-pilot' : 'co-pilot',
                autoFixEnabled: isAuto
            }
        }));
    };
    
    if (loading) {
        return <DashboardSkeleton />;
    }
    
    // Inject the governance onChange handler
    const dashboardData = {
        ...data,
        governanceStatus: {
            ...data.governanceStatus,
            onChange: handleGovernanceChange
        }
    };
    
    return <Dashboard data={dashboardData} />;
}

// =============================================================================
// SKELETON SCREEN — Prevents layout shift during loading
// =============================================================================

function DashboardSkeleton() {
    return (
        <div style={{
            maxWidth: 960,
            margin: '0 auto',
            padding: 24,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
        }}>
            {/* Skeleton grid matching dashboard layout */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '280px 1fr',
                gap: 24,
                marginBottom: 32
            }}>
                {/* Skeleton gauge */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 200,
                        height: 200,
                        borderRadius: '50%',
                        backgroundColor: '#e5e7eb',
                        margin: '0 auto',
                        animation: 'pulse 1.5s infinite'
                    }} />
                    <div style={{
                        width: 120,
                        height: 16,
                        backgroundColor: '#e5e7eb',
                        borderRadius: 4,
                        margin: '16px auto 0',
                        animation: 'pulse 1.5s infinite'
                    }} />
                </div>
                
                {/* Skeleton summary */}
                <div>
                    <div style={{
                        width: '80%',
                        height: 24,
                        backgroundColor: '#e5e7eb',
                        borderRadius: 4,
                        marginBottom: 12,
                        animation: 'pulse 1.5s infinite'
                    }} />
                    <div style={{
                        width: '60%',
                        height: 16,
                        backgroundColor: '#e5e7eb',
                        borderRadius: 4,
                        marginBottom: 8,
                        animation: 'pulse 1.5s infinite'
                    }} />
                    <div style={{
                        width: '40%',
                        height: 16,
                        backgroundColor: '#e5e7eb',
                        borderRadius: 4,
                        marginBottom: 16,
                        animation: 'pulse 1.5s infinite'
                    }} />
                    <div style={{
                        display: 'flex',
                        gap: 24,
                        padding: 12,
                        backgroundColor: '#f9fafb',
                        borderRadius: 8
                    }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                                <div style={{
                                    width: 40,
                                    height: 20,
                                    backgroundColor: '#e5e7eb',
                                    borderRadius: 4,
                                    margin: '0 auto',
                                    animation: 'pulse 1.5s infinite'
                                }} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* Skeleton feed */}
            {[1, 2, 3].map(i => (
                <div key={i} style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 12,
                    backgroundColor: '#ffffff'
                }}>
                    <div style={{
                        width: '60%',
                        height: 16,
                        backgroundColor: '#e5e7eb',
                        borderRadius: 4,
                        animation: 'pulse 1.5s infinite'
                    }} />
                </div>
            ))}
            
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
}

// =============================================================================
// LIVE DASHBOARD — Real API consumer (swap in for production)
// =============================================================================

export function LiveDashboard({ apiKey }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        fetch('/api/dashboard/summary', {
            headers: { 'x-api-key': apiKey }
        })
        .then(res => {
            if (!res.ok) throw new Error(`API returned ${res.status}`);
            return res.json();
        })
        .then(json => {
            setData(json);
            setLoading(false);
        })
        .catch(err => {
            setError(err.message);
            setLoading(false);
        });
    }, [apiKey]);
    
    if (loading) return <DashboardSkeleton />;
    if (error) return <ErrorState message={error} />;
    
    return <Dashboard data={data} />;
}

function ErrorState({ message }) {
    return (
        <div style={{
            maxWidth: 400,
            margin: '80px auto',
            textAlign: 'center',
            padding: 40,
            backgroundColor: '#fef2f2',
            borderRadius: 12,
            border: '1px solid #fecaca'
        }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#991b1b', marginBottom: 8 }}>
                Unable to load dashboard
            </div>
            <div style={{ fontSize: 14, color: '#7f1d1d' }}>
                {message}
            </div>
        </div>
    );
}

// =============================================================================
// EXPORTS
// =============================================================================

export { MOCK_RESPONSE };
