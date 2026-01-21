import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import { useFirm } from '@/lib/FirmProvider';
import { canManageMembers } from '@/lib/permissions';

type IntakeSettings = {
    firm_logo_url: string | null;
    brand_accent_preset: string;
    brand_theme_default: string;
    enabled_intakes: string[];
    default_intake_type: string | null;
    show_not_sure_option: boolean;
    welcome_message: string | null;
    what_to_expect_bullets: string[] | null;
};

const DEFAULT_SETTINGS: IntakeSettings = {
    firm_logo_url: null,
    brand_accent_preset: 'verilex_default',
    brand_theme_default: 'system',
    enabled_intakes: ['custody_unmarried', 'divorce_no_children', 'divorce_with_children'],
    default_intake_type: null,
    show_not_sure_option: true,
    welcome_message: null,
    what_to_expect_bullets: null,
};

const ACCENT_PRESETS = [
    { value: 'verilex_default', label: 'VeriLex Default (Purple)', color: '#7c3aed' },
    { value: 'slate', label: 'Slate', color: '#475569' },
    { value: 'indigo', label: 'Indigo', color: '#4f46e5' },
    { value: 'emerald', label: 'Emerald', color: '#059669' },
    { value: 'amber', label: 'Amber', color: '#d97706' },
    { value: 'rose', label: 'Rose', color: '#e11d48' },
];

const THEME_OPTIONS = [
    { value: 'system', label: 'System Default' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
];

const INTAKE_TYPES = [
    { id: 'custody_unmarried', label: 'Child Custody' },
    { id: 'divorce_no_children', label: 'Divorce (No Children)' },
    { id: 'divorce_with_children', label: 'Divorce with Children' },
];

export default function IntakeBrandingPage() {
    const router = useRouter();
    const { state } = useFirm();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [settings, setSettings] = useState<IntakeSettings>(DEFAULT_SETTINGS);

    useEffect(() => {
        if (!state.loading && !state.authed) {
            router.replace('/auth/sign-in');
        }
    }, [router, state.authed, state.loading]);

    // Load existing settings
    useEffect(() => {
        if (!state.authed || !state.firmId) return;

        let isMounted = true;
        const loadSettings = async () => {
            setLoading(true);
            setError(null);

            const { data, error: loadError } = await supabase
                .from('firm_intake_settings')
                .select('*')
                .eq('firm_id', state.firmId)
                .maybeSingle();

            if (!isMounted) return;

            if (loadError) {
                console.error('Failed to load settings:', loadError);
            }

            if (data) {
                setSettings({
                    firm_logo_url: data.firm_logo_url ?? null,
                    brand_accent_preset: data.brand_accent_preset ?? 'verilex_default',
                    brand_theme_default: data.brand_theme_default ?? 'system',
                    enabled_intakes: data.enabled_intakes ?? DEFAULT_SETTINGS.enabled_intakes,
                    default_intake_type: data.default_intake_type ?? null,
                    show_not_sure_option: data.show_not_sure_option ?? true,
                    welcome_message: data.welcome_message ?? null,
                    what_to_expect_bullets: data.what_to_expect_bullets ?? null,
                });
            }

            setLoading(false);
        };

        loadSettings();
        return () => { isMounted = false; };
    }, [state.authed, state.firmId]);

    const handleSave = async () => {
        if (!state.firmId) return;
        setSaving(true);
        setSaved(false);
        setError(null);

        // Validate
        if (settings.default_intake_type && !settings.enabled_intakes.includes(settings.default_intake_type)) {
            setError('Default intake type must be one of the enabled intakes.');
            setSaving(false);
            return;
        }

        if (settings.enabled_intakes.length === 0) {
            setError('At least one intake type must be enabled.');
            setSaving(false);
            return;
        }

        if (settings.welcome_message && settings.welcome_message.length > 240) {
            setError('Welcome message must be 240 characters or less.');
            setSaving(false);
            return;
        }

        if (settings.what_to_expect_bullets && settings.what_to_expect_bullets.length > 3) {
            setError('Maximum 3 bullets allowed.');
            setSaving(false);
            return;
        }

        // Upsert settings
        const { error: saveError } = await supabase
            .from('firm_intake_settings')
            .upsert({
                firm_id: state.firmId,
                firm_logo_url: settings.firm_logo_url || null,
                brand_accent_preset: settings.brand_accent_preset,
                brand_theme_default: settings.brand_theme_default,
                enabled_intakes: settings.enabled_intakes,
                default_intake_type: settings.default_intake_type || null,
                show_not_sure_option: settings.show_not_sure_option,
                welcome_message: settings.welcome_message || null,
                what_to_expect_bullets: settings.what_to_expect_bullets?.filter(b => b.trim()) || null,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'firm_id',
            });

        if (saveError) {
            const msg = saveError.message.toLowerCase().includes('permission')
                ? 'You do not have permission to update intake settings.'
                : saveError.message;
            setError(msg);
        } else {
            setSaved(true);
        }

        setSaving(false);
    };

    const toggleIntake = (intakeId: string) => {
        setSettings(prev => {
            const enabled = prev.enabled_intakes.includes(intakeId)
                ? prev.enabled_intakes.filter(id => id !== intakeId)
                : [...prev.enabled_intakes, intakeId];

            // Clear default if it's no longer enabled
            const defaultType = prev.default_intake_type && !enabled.includes(prev.default_intake_type)
                ? null
                : prev.default_intake_type;

            return { ...prev, enabled_intakes: enabled, default_intake_type: defaultType };
        });
    };

    const updateBullet = (index: number, value: string) => {
        setSettings(prev => {
            const bullets = [...(prev.what_to_expect_bullets ?? [])];
            bullets[index] = value;
            return { ...prev, what_to_expect_bullets: bullets };
        });
    };

    const addBullet = () => {
        if ((settings.what_to_expect_bullets?.length ?? 0) >= 3) return;
        setSettings(prev => ({
            ...prev,
            what_to_expect_bullets: [...(prev.what_to_expect_bullets ?? []), ''],
        }));
    };

    const removeBullet = (index: number) => {
        setSettings(prev => ({
            ...prev,
            what_to_expect_bullets: (prev.what_to_expect_bullets ?? []).filter((_, i) => i !== index),
        }));
    };

    if (state.loading) {
        return <p className="text-[color:var(--text-2)]">Loading...</p>;
    }

    if (!state.authed) {
        return <p className="text-[color:var(--text-2)]">Redirecting to sign in...</p>;
    }

    if (!canManageMembers(state.role)) {
        return (
            <>
                <Head>
                    <title>MyClient | Intake Branding</title>
                </Head>
                <div className="mx-auto max-w-4xl space-y-6">
                    <Link href="/myclient/settings" className="text-sm text-[color:var(--text-2)] hover:text-white transition">
                        ← Back to Settings
                    </Link>
                    <section className="rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
                        <h2 className="text-lg font-semibold text-white">Intake Branding</h2>
                        <p className="mt-2 text-sm text-[color:var(--text-2)]">
                            Admin only. Please contact your firm admin for updates.
                        </p>
                    </section>
                </div>
            </>
        );
    }

    return (
        <>
            <Head>
                <title>MyClient | Intake Branding</title>
            </Head>
            <div className="mx-auto max-w-4xl space-y-6">
                <div>
                    <Link href="/myclient/settings" className="text-sm text-[color:var(--text-2)] hover:text-white transition">
                        ← Back to Settings
                    </Link>
                    <h1 className="mt-3 text-3xl font-semibold text-white">Intake Branding</h1>
                    <p className="mt-2 text-sm text-[color:var(--text-2)]">
                        Customize how your intake portal appears to clients.
                    </p>
                </div>

                {loading ? (
                    <p className="text-sm text-[color:var(--text-2)]">Loading settings...</p>
                ) : (
                    <>
                        {/* Branding Section */}
                        <section className="rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
                            <h2 className="text-lg font-semibold text-white">Branding</h2>
                            <div className="mt-6 grid gap-6">
                                <label className="grid gap-2 text-sm text-[color:var(--text-2)]">
                                    Logo URL
                                    <input
                                        type="url"
                                        value={settings.firm_logo_url ?? ''}
                                        onChange={(e) => setSettings(prev => ({ ...prev, firm_logo_url: e.target.value || null }))}
                                        placeholder="https://example.com/logo.png"
                                        className="rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-2 text-base text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                                    />
                                </label>

                                <label className="grid gap-2 text-sm text-[color:var(--text-2)]">
                                    Accent Color
                                    <select
                                        value={settings.brand_accent_preset}
                                        onChange={(e) => setSettings(prev => ({ ...prev, brand_accent_preset: e.target.value }))}
                                        className="rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-2 text-base text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                                    >
                                        {ACCENT_PRESETS.map(preset => (
                                            <option key={preset.value} value={preset.value}>
                                                {preset.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="grid gap-2 text-sm text-[color:var(--text-2)]">
                                    Default Theme
                                    <select
                                        value={settings.brand_theme_default}
                                        onChange={(e) => setSettings(prev => ({ ...prev, brand_theme_default: e.target.value }))}
                                        className="rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-2 text-base text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                                    >
                                        {THEME_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                        </section>

                        {/* Intake Suite Section */}
                        <section className="rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
                            <h2 className="text-lg font-semibold text-white">Intake Suite</h2>
                            <p className="mt-2 text-sm text-[color:var(--text-2)]">
                                Choose which intake types are available to clients.
                            </p>
                            <div className="mt-6 grid gap-4">
                                {INTAKE_TYPES.map(type => (
                                    <label key={type.id} className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.enabled_intakes.includes(type.id)}
                                            onChange={() => toggleIntake(type.id)}
                                            className="w-5 h-5 rounded border-white/20 bg-[var(--surface-0)] text-[color:var(--accent)] focus:ring-[color:var(--accent)]"
                                        />
                                        <span className="text-sm text-white">{type.label}</span>
                                    </label>
                                ))}

                                <label className="grid gap-2 text-sm text-[color:var(--text-2)] mt-4">
                                    Default Intake Type
                                    <select
                                        value={settings.default_intake_type ?? ''}
                                        onChange={(e) => setSettings(prev => ({ ...prev, default_intake_type: e.target.value || null }))}
                                        className="rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-2 text-base text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                                    >
                                        <option value="">None</option>
                                        {INTAKE_TYPES.filter(t => settings.enabled_intakes.includes(t.id)).map(type => (
                                            <option key={type.id} value={type.id}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer mt-2">
                                    <input
                                        type="checkbox"
                                        checked={settings.show_not_sure_option}
                                        onChange={(e) => setSettings(prev => ({ ...prev, show_not_sure_option: e.target.checked }))}
                                        className="w-5 h-5 rounded border-white/20 bg-[var(--surface-0)] text-[color:var(--accent)] focus:ring-[color:var(--accent)]"
                                    />
                                    <span className="text-sm text-white">Show "Not sure — help me choose" option</span>
                                </label>
                            </div>
                        </section>

                        {/* Content Blocks Section */}
                        <section className="rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
                            <h2 className="text-lg font-semibold text-white">Content Blocks</h2>
                            <div className="mt-6 grid gap-6">
                                <label className="grid gap-2 text-sm text-[color:var(--text-2)]">
                                    Welcome Message
                                    <textarea
                                        value={settings.welcome_message ?? ''}
                                        onChange={(e) => setSettings(prev => ({ ...prev, welcome_message: e.target.value || null }))}
                                        placeholder="Optional message shown on the intake selector page"
                                        maxLength={240}
                                        rows={3}
                                        className="rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-2 text-base text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)] resize-none"
                                    />
                                    <span className="text-xs text-[color:var(--muted)]">
                                        {(settings.welcome_message?.length ?? 0)}/240 characters
                                    </span>
                                </label>

                                <div className="grid gap-2">
                                    <span className="text-sm text-[color:var(--text-2)]">What to Expect Bullets</span>
                                    {(settings.what_to_expect_bullets ?? []).map((bullet, index) => (
                                        <div key={index} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={bullet}
                                                onChange={(e) => updateBullet(index, e.target.value)}
                                                maxLength={120}
                                                placeholder="Enter bullet point"
                                                className="flex-1 rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-2 text-base text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeBullet(index)}
                                                className="text-red-400 hover:text-red-300 px-2"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    {(settings.what_to_expect_bullets?.length ?? 0) < 3 && (
                                        <button
                                            type="button"
                                            onClick={addBullet}
                                            className="text-sm text-[color:var(--accent-light)] hover:text-white transition w-fit"
                                        >
                                            + Add bullet
                                        </button>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* Save Button */}
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                                className="rounded-lg bg-[color:var(--accent-light)] px-6 py-3 text-sm font-semibold text-white hover:bg-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                            {saved && <span className="text-sm text-emerald-300">Saved</span>}
                            {error && (
                                <span className="text-sm text-red-300">{error}</span>
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
