/**
 * In-memory store for scan results to avoid sessionStorage size limits.
 * Camera photos can be 5-10MB as base64, which exceeds sessionStorage's ~5MB quota.
 */
import type { IdentifyResponse } from '@/lib/api/identifyCollectible';

let _scanResult: IdentifyResponse | null = null;
let _userPhoto: string | null = null;

export function setScanData(result: IdentifyResponse, userPhoto: string | null) {
  _scanResult = result;
  _userPhoto = userPhoto;
}

export function getScanData() {
  return { scanResult: _scanResult, userPhoto: _userPhoto };
}

export function clearScanData() {
  _scanResult = null;
  _userPhoto = null;
}
