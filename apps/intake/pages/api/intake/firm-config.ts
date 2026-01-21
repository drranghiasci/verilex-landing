import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../../lib/server/supabaseAdmin';
import {
    getRequestId,
    logRequestStart,
    requireMethod,
    sendError,
} from '@/lib/apiUtils';

// Default intake settings when no firm settings exist
const DEFAULT_SETTINGS = {
    firm_logo_url: null,
    brand_accent_preset: 'verilex_default',
    brand_theme_default: 'system',
    enabled_intakes: ['custody_unmarried', 'divorce_no_children', 'divorce_with_children'],
    default_intake_type: null,
    show_not_sure_option: true,
    welcome_message: null,
    what_to_expect_bullets: null,
};

export type FirmConfigResponse = {
    firm: {
        id: string;
        name: string;
        website_url: string | null;
    };
    intake_settings: {
        firm_logo_url: string | null;
        brand_accent_preset: string;
        brand_theme_default: string;
        enabled_intakes: string[];
        default_intake_type: string | null;
        show_not_sure_option: boolean;
        welcome_message: string | null;
        what_to_expect_bullets: string[] | null;
    };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const requestId = getRequestId(req);
    logRequestStart(req, requestId);

    if (!requireMethod(req, res, ['GET'], requestId)) {
        return;
    }

    const slug = req.query.slug;
    if (!slug || typeof slug !== 'string') {
        sendError(res, 400, 'Missing or invalid slug parameter', requestId);
        return;
    }

    const firmSlug = slug.trim().toLowerCase();
    if (!firmSlug) {
        sendError(res, 400, 'Slug cannot be empty', requestId);
        return;
    }

    try {
        // Use secure RPC to get firm config (handles defaults internally)
        const { data, error } = await supabaseAdmin.rpc('get_firm_intake_config', {
            p_firm_slug: firmSlug,
        });

        if (error) {
            console.error('[firm-config] RPC error:', error);
            sendError(res, 500, 'Unable to load firm configuration', requestId);
            return;
        }

        if (!data) {
            sendError(res, 404, 'Firm not found', requestId);
            return;
        }

        // Type assertion - RPC returns JSON
        const config = data as FirmConfigResponse;

        return res.status(200).json({
            ok: true,
            ...config,
        });
    } catch (err) {
        console.error('[firm-config] Exception:', err);
        sendError(res, 500, 'Unable to load firm configuration', requestId);
        return;
    }
}
