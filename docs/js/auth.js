// auth.js — Auth helper functions for RankFixer
// Depends on: supabase.js (loaded first)

const Auth = {
    // --- Public API ---

    /** Check if user is logged in. Returns {user, session} or null. */
    async getSession() {
        const sb = getSupabase();
        if (!sb) return null;
        const { data } = await sb.auth.getSession();
        return data.session ? { user: data.session.user, session: data.session } : null;
    },

    /** Sign up with email + password. Returns {user, error}. */
    async signUp(email, password) {
        const sb = getSupabase();
        const { data, error } = await sb.auth.signUp({ email, password });
        if (!error && data.user) {
            // Capture email for PLG mailing list
            Auth._captureEmail(email, 'email_signup');
        }
        return { user: data.user, error };
    },

    /** Sign in with email + password. Returns {user, error}. */
    async signIn(email, password) {
        const sb = getSupabase();
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        return { user: data.user, error };
    },

    /** Sign in with Google OAuth. Redirects to Google. */
    async signInWithGoogle() {
        const sb = getSupabase();
        const redirectTo = window.location.origin + '/report/';
        await sb.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo }
        });
    },

    /** Sign out. */
    async signOut() {
        const sb = getSupabase();
        await sb.auth.signOut();
    },

    /** Get the current user's email (or null). */
    async getUserEmail() {
        const session = await this.getSession();
        return session ? session.user.email : null;
    },

    /** Store email for the PLG mailing list. */
    async _captureEmail(email, source) {
        const sb = getSupabase();
        try {
            await sb.from('email_subscribers').upsert({
                email: email,
                source: source || 'web',
                signed_up_at: new Date().toISOString(),
            }, { onConflict: 'email' });
        } catch (e) {
            // Silently fail — email capture is non-critical
            console.warn('Email capture skipped:', e.message);
        }
    },

    // --- UI Helpers ---

    /** Show the auth modal on the current page. */
    showAuthModal(onSuccess) {
        const existing = document.getElementById('auth-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'auth-modal';
        modal.innerHTML = `
            <div class="auth-overlay">
                <div class="auth-card">
                    <button class="auth-close" onclick="Auth.closeAuthModal()">&times;</button>
                    <h2>Sign in to get your full report</h2>
                    <p class="auth-sub">Free account. Instant access.</p>

                    <button class="btn-google" onclick="Auth.signInWithGoogle()">
                        <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92a8.78 8.78 0 002.68-6.62z"/><path fill="#34A853" d="M9 18c2.48 0 4.56-.82 6.08-2.22l-2.92-2.26a5.45 5.45 0 01-3.16.9 5.48 5.48 0 01-5.16-3.78H.74v2.34A9.18 9.18 0 009 18z"/><path fill="#FBBC05" d="M3.84 10.64a5.5 5.5 0 010-3.48V4.82H.74a9.18 9.18 0 000 8.16l3.1-2.34z"/><path fill="#EA4335" d="M9 3.48c1.34 0 2.54.46 3.5 1.38l2.62-2.62A9.14 9.14 0 009 0 9.18 9.18 0 00.74 4.82l3.1 2.34A5.48 5.48 0 019 3.48z"/></svg>
                        Continue with Google
                    </button>

                    <div class="auth-divider"><span>or use email</span></div>
                    <div id="auth-error" class="auth-error" style="display:none"></div>
                    <form id="auth-form" onsubmit="Auth.handleEmailAuth(event, '${typeof onSuccess === 'string' ? onSuccess : 'redirect'}')">
                        <input type="email" id="auth-email" placeholder="you@example.com" required>
                        <input type="password" id="auth-password" placeholder="Password (min 6 chars)" minlength="6" required>
                        <button type="submit" class="btn-primary" style="width:100%">Sign In / Sign Up</button>
                    </form>
                    <p class="auth-hint">New accounts are created automatically. No email verification required.</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Add inline styles for the modal
        if (!document.getElementById('auth-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'auth-modal-styles';
            style.textContent = `
                .auth-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:9999; }
                .auth-card { background:var(--bg-card,#151528); border:1px solid var(--border,#2A2A45); border-radius:16px; padding:2rem; width:100%; max-width:400px; position:relative; margin:1rem; }
                .auth-card h2 { font-size:1.2rem; margin-bottom:0.3rem; color:var(--text,#F0F0F5); }
                .auth-sub { font-size:0.85rem; color:var(--text-muted,#8888A0); margin-bottom:1.2rem; }
                .auth-close { position:absolute; top:12px; right:16px; background:none; border:none; color:var(--text-muted,#8888A0); font-size:1.5rem; cursor:pointer; }
                .auth-close:hover { color:var(--text,#F0F0F5); }
                .btn-google { display:flex; align-items:center; justify-content:center; gap:10px; width:100%; padding:10px; background:white; border:1px solid #ddd; border-radius:8px; font-size:0.9rem; font-weight:500; cursor:pointer; color:#333; margin-bottom:1rem; }
                .btn-google:hover { background:#f5f5f5; }
                .auth-divider { display:flex; align-items:center; gap:1rem; margin:1rem 0; color:var(--text-muted,#8888A0); font-size:0.8rem; }
                .auth-divider::before, .auth-divider::after { content:''; flex:1; height:1px; background:var(--border,#2A2A45); }
                .auth-error { background:rgba(255,80,80,0.15); color:#ff5050; padding:0.6rem 1rem; border-radius:8px; font-size:0.85rem; margin-bottom:1rem; }
                #auth-form { display:flex; flex-direction:column; gap:0.75rem; }
                #auth-form input { background:var(--bg-input,#1E1E36); border:1px solid var(--border,#2A2A45); border-radius:8px; padding:10px 14px; color:var(--text,#F0F0F5); font-size:0.9rem; font-family:inherit; }
                #auth-form input:focus { outline:none; border-color:var(--brand,#6C5CE7); }
                .auth-hint { font-size:0.75rem; color:var(--text-muted,#8888A0); text-align:center; margin-top:0.75rem; }
            `;
            document.head.appendChild(style);
        }
    },

    /** Close the auth modal. */
    closeAuthModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) modal.remove();
    },

    /** Handle email auth form submission. */
    async handleEmailAuth(event, onSuccess) {
        event.preventDefault();
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;
        const errorEl = document.getElementById('auth-error');

        if (!email || !password) {
            errorEl.textContent = 'Please enter email and password.';
            errorEl.style.display = 'block';
            return;
        }

        // Try sign in first
        let result = await Auth.signIn(email, password);

        // If sign in fails, try sign up
        if (result.error) {
            result = await Auth.signUp(email, password);
            if (result.error) {
                errorEl.textContent = result.error.message || 'Authentication failed.';
                errorEl.style.display = 'block';
                return;
            }
        }

        // Success
        Auth.closeAuthModal();
        if (onSuccess === 'redirect') {
            const params = new URLSearchParams(window.location.search);
            const url = params.get('url') || '';
            window.location.href = '/report/' + (url ? '?url=' + encodeURIComponent(url) : '');
        } else if (typeof onSuccess === 'function') {
            onSuccess(result.user);
        }
    },

    /** Check payment status for the current user. */
    async checkPayment() {
        const sb = getSupabase();
        const session = await this.getSession();
        if (!session) return { paid: false, reason: 'not_authenticated' };

        const { data, error } = await sb
            .from('payments')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('paid', true)
            .single();

        if (error || !data) {
            return { paid: false, reason: 'not_paid' };
        }
        return { paid: true, payment: data };
    },

    /** Record a payment in Supabase. */
    async recordPayment(paypalOrderId, amount) {
        const sb = getSupabase();
        const session = await this.getSession();
        if (!session) return { error: 'Not authenticated' };

        const { data, error } = await sb.from('payments').upsert({
            user_id: session.user.id,
            email: session.user.email,
            paid: true,
            amount: amount || '$29',
            paypal_order_id: paypalOrderId,
            created_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

        return { data, error };
    }
};

// Auto-check: if URL has ?signup=true, show auth modal
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.search.includes('signup=true')) {
        setTimeout(() => Auth.showAuthModal('redirect'), 500);
    }
});
