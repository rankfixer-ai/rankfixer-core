// dashboard-interactions.js
// Rankfixer Platform — Interactive Dashboard
// Wires stateful actions to the UI components.
// Handles: approve/dismiss, governance toggle, detail drawer, real-time feed.

import React, { useState, useCallback } from 'react';
import { Dashboard } from './ui-components.js';
import { MOCK_RESPONSE } from './mock-dashboard.js';

// =============================================================================
// INTERACTIVE DASHBOARD — Full state management
// =============================================================================

export function InteractiveDashboard() {
    const [data, setData] = useState(MOCK_RESPONSE);
    const [loading, setLoading] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [toast, setToast] = useState(null);
    
    // ── Approve a pending action ──────────────────────────────
    const handleApprove = useCallback((activityId) => {
        setData(prev => {
            const updatedFeed = prev.activityFeed.map(activity => {
                if (activity.id !== activityId) return activity;
                return {
                    ...activity,
                    type: 'fixed',
                    title: `Approved: ${activity.title}`,
                    afterState: `Fix applied. ${activity.recommendation}`,
                    executionTime: 'Just now',
                    reversible: true
                };
            });
            
            return {
                ...prev,
                activityFeed: updatedFeed,
                stats: {
                    ...prev.stats,
                    pendingDecisions: prev.stats.pendingDecisions - 1,
                    autoFixedSinceLast: prev.stats.autoFixedSinceLast + 1
                },
                executiveSummary: {
                    ...prev.executiveSummary,
                    callToAction: prev.stats.pendingDecisions - 1 > 0
                        ? `${prev.stats.pendingDecisions - 1} decisions need your attention.`
                        : "No decisions pending — you're all clear."
                }
            };
        });
        
        showToast('Fix approved and applied.', 'success');
    }, []);
    
    // ── Dismiss a pending action ──────────────────────────────
    const handleDismiss = useCallback((activityId) => {
        setData(prev => {
            const updatedFeed = prev.activityFeed.map(activity => {
                if (activity.id !== activityId) return activity;
                return {
                    ...activity,
                    type: 'detected',
                    title: `Dismissed: ${activity.title}`,
                    subtitle: 'Marked as acknowledged — no action taken'
                };
            });
            
            return {
                ...prev,
                activityFeed: updatedFeed,
                stats: {
                    ...prev.stats,
                    pendingDecisions: prev.stats.pendingDecisions - 1
                },
                executiveSummary: {
                    ...prev.executiveSummary,
                    callToAction: prev.stats.pendingDecisions - 1 > 0
                        ? `${prev.stats.pendingDecisions - 1} decisions need your attention.`
                        : "No decisions pending — you're all clear."
                }
            };
        });
        
        showToast('Issue dismissed.', 'info');
    }, []);
    
    // ── Toggle governance mode ────────────────────────────────
    const handleGovernanceChange = useCallback((isAuto) => {
        setData(prev => ({
            ...prev,
            governanceStatus: {
                ...prev.governanceStatus,
                mode: isAuto ? 'auto-pilot' : 'co-pilot',
                autoFixEnabled: isAuto
            }
        }));
        
        showToast(
            isAuto 
                ? 'Auto-Pilot enabled. Minor fixes will be applied automatically.' 
                : 'Co-Pilot enabled. All fixes will wait for your approval.',
            'info'
        );
    }, []);
    
    // ── View activity details ─────────────────────────────────
    const handleViewDetails = useCallback((activityId) => {
        const activity = data.activityFeed.find(a => a.id === activityId);
        setSelectedActivity(activity);
    }, [data.activityFeed]);
    
    const handleCloseDetails = useCallback(() => {
        setSelectedActivity(null);
    }, []);
    
    // ── Toast notifications ───────────────────────────────────
    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };
    
    // ── Build interactive activity feed ───────────────────────
    const interactiveFeed = data.activityFeed.map(activity => ({
        ...activity,
        onApprove: activity.type === 'decision_required' 
            ? () => handleApprove(activity.id) 
            : undefined,
        onDismiss: activity.type === 'decision_required' 
            ? () => handleDismiss(activity.id) 
            : undefined,
        onViewDetails: () => handleViewDetails(activity.id)
    }));
    
    const interactiveData = {
        ...data,
        activityFeed: interactiveFeed,
        governanceStatus: {
            ...data.governanceStatus,
            onChange: handleGovernanceChange
        }
    };
    
    return (
        <>
            <Dashboard data={interactiveData} />
            
            {/* Activity detail drawer */}
            {selectedActivity && (
                <DetailDrawer 
                    activity={selectedActivity} 
                    onClose={handleCloseDetails}
                    onApprove={selectedActivity.type === 'decision_required' ? () => handleApprove(selectedActivity.id) : null}
                />
            )}
            
            {/* Toast notification */}
            {toast && <Toast message={toast.message} type={toast.type} />}
        </>
    );
}

// =============================================================================
// DETAIL DRAWER — Slides in from right when "See details" clicked
// =============================================================================

function DetailDrawer({ activity, onClose, onApprove }) {
    return (
        <>
            {/* Overlay */}
            <div onClick={onClose} style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.3)',
                zIndex: 100
            }} />
            
            {/* Drawer */}
            <div style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: 480,
                maxWidth: '90vw',
                backgroundColor: '#ffffff',
                boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
                zIndex: 101,
                padding: 32,
                overflowY: 'auto',
                animation: 'slideIn 0.2s ease-out'
            }}>
                {/* Close button */}
                <button onClick={onClose} style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    background: 'none',
                    border: 'none',
                    fontSize: 20,
                    cursor: 'pointer',
                    color: '#6b7280'
                }}>
                    ✕
                </button>
                
                {/* Activity type badge */}
                <div style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 16,
                    backgroundColor: activity.type === 'decision_required' ? '#fef3c7' :
                                    activity.type === 'fixed' ? '#dcfce7' : '#f3f4f6',
                    color: activity.type === 'decision_required' ? '#92400e' :
                           activity.type === 'fixed' ? '#166534' : '#374151'
                }}>
                    {activity.type === 'fixed' ? '✅ Fixed' :
                     activity.type === 'decision_required' ? '⚠️ Needs Decision' :
                     activity.type === 'detected' ? '🔍 Detected' :
                     activity.type === 'rolled_back' ? '🔁 Rolled Back' : '📊 Alert'}
                </div>
                
                {/* Title */}
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
                    {activity.title}
                </h3>
                {activity.subtitle && (
                    <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>
                        {activity.subtitle}
                    </p>
                )}
                
                {/* Before/After or Risk */}
                {activity.type === 'fixed' ? (
                    <div style={{ marginBottom: 20 }}>
                        <div style={{
                            backgroundColor: '#fef2f2',
                            borderRadius: 8,
                            padding: 16,
                            marginBottom: 12
                        }}>
                            <div style={{ fontSize: 12, color: '#991b1b', fontWeight: 600, marginBottom: 4 }}>
                                BEFORE
                            </div>
                            <div style={{ fontSize: 14, color: '#7f1d1d' }}>
                                {activity.beforeState}
                            </div>
                        </div>
                        <div style={{
                            backgroundColor: '#f0fdf4',
                            borderRadius: 8,
                            padding: 16
                        }}>
                            <div style={{ fontSize: 12, color: '#166534', fontWeight: 600, marginBottom: 4 }}>
                                AFTER
                            </div>
                            <div style={{ fontSize: 14, color: '#14532d' }}>
                                {activity.afterState}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{
                        backgroundColor: '#fffbeb',
                        borderRadius: 8,
                        padding: 16,
                        marginBottom: 20
                    }}>
                        <div style={{ fontSize: 14, color: '#92400e', marginBottom: 8 }}>
                            <strong>Risk:</strong> {activity.risk}
                        </div>
                        {activity.blastRadius > 0 && (
                            <div style={{ fontSize: 14, color: '#92400e', marginBottom: 8 }}>
                                <strong>Blast Radius:</strong> {activity.blastRadius} {activity.blastRadiusLabel || 'resources'}
                            </div>
                        )}
                        <div style={{ fontSize: 14, color: '#92400e' }}>
                            <strong>Recommendation:</strong> {activity.recommendation}
                        </div>
                    </div>
                )}
                
                {/* Metadata */}
                <div style={{
                    display: 'flex',
                    gap: 16,
                    padding: 12,
                    backgroundColor: '#f9fafb',
                    borderRadius: 8,
                    marginBottom: 24,
                    fontSize: 13,
                    color: '#6b7280'
                }}>
                    {activity.affectedCount > 0 && (
                        <div>📄 {activity.affectedCount} {activity.affectedLabel || 'items'}</div>
                    )}
                    {activity.executionTime && (
                        <div>⏱ {activity.executionTime}</div>
                    )}
                    {activity.reversible && (
                        <div style={{ color: '#22c55e' }}>🔁 Reversible</div>
                    )}
                </div>
                
                {/* Action buttons */}
                {activity.type === 'decision_required' && onApprove && (
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={onApprove} style={{
                            flex: 1,
                            padding: '12px 24px',
                            backgroundColor: '#1d4ed8',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 10,
                            fontSize: 15,
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}>
                            ✅ Approve & Apply Fix
                        </button>
                        <button onClick={onClose} style={{
                            flex: 1,
                            padding: '12px 24px',
                            backgroundColor: '#ffffff',
                            color: '#6b7280',
                            border: '1px solid #d1d5db',
                            borderRadius: 10,
                            fontSize: 15,
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}>
                            Dismiss
                        </button>
                    </div>
                )}
                
                {/* Timestamp */}
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 16 }}>
                    Detected: {new Date(activity.timestamp).toLocaleString()}
                </div>
            </div>
            
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `}</style>
        </>
    );
}

// =============================================================================
// TOAST — Temporary notification
// =============================================================================

function Toast({ message, type = 'info' }) {
    const bgColor = type === 'success' ? '#22c55e' :
                    type === 'error' ? '#ef4444' :
                    '#3b82f6';
    
    return (
        <div style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            backgroundColor: bgColor,
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 200,
            animation: 'fadeInUp 0.3s ease-out'
        }}>
            {message}
            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

// =============================================================================
// EXPORTS
// =============================================================================

export { InteractiveDashboard, DetailDrawer, Toast };
