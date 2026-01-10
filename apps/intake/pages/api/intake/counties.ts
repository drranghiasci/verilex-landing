import type { NextApiRequest, NextApiResponse } from 'next';
import { loadGaCounties } from '../../../../../lib/intake/gaCounties';
import { buildCountyOptions, sortCountyOptions } from '../../../../../lib/intake/countyCanonical';
import {
  getRequestId,
  logRequestStart,
  requireMethod,
  sendError,
} from './_utils';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = getRequestId(req);
  logRequestStart(req, requestId);

  if (!requireMethod(req, res, ['GET'], requestId)) {
    return;
  }

  try {
    const counties = loadGaCounties();
    const options = sortCountyOptions(buildCountyOptions(counties));
    return res.status(200).json({
      ok: true,
      canonicalRule: 'slug_preferred_name_fallback',
      counties: options,
    });
  } catch (error) {
    sendError(res, 500, 'Unable to load counties', requestId);
    return;
  }
}
