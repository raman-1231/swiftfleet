import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import {
  Search,
  Package,
  MapPin,
  Lock,
  ArrowRight,
  AlertCircle,
  ClipboardPaste,
  ShieldCheck,
  Truck
} from 'lucide-react';

/**
 * Extracts and sanitizes a tracking token from user input.
 * Handles full URLs (https://.../track/:token), partial paths (/track/:token),
 * query parameters (?token=:token), or raw tokens.
 */
export function extractTrackingToken(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return '';
  const trimmed = rawInput.trim();

  // Match /track/:token path in URLs or relative paths
  const pathMatch = trimmed.match(/\/track\/([a-zA-Z0-9_-]+)/i);
  if (pathMatch && pathMatch[1]) {
    return pathMatch[1].trim();
  }

  // Match ?token=... or ?trackingToken=... in URLs
  const queryMatch = trimmed.match(/[?&](?:token|trackingToken)=([a-zA-Z0-9_-]+)/i);
  if (queryMatch && queryMatch[1]) {
    return queryMatch[1].trim();
  }

  // Raw token (hex / url-safe alphanumeric, at least 16 chars)
  if (/^[a-zA-Z0-9_-]{16,64}$/.test(trimmed)) {
    return trimmed;
  }

  return '';
}

export const TrackOrderLookupPage = () => {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInputValue(text.trim());
          setError('');
        }
      }
    } catch (_) {
      // Clipboard access denied or unsupported; ignore gracefully
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const trimmed = inputValue.trim();
    if (!trimmed) {
      setError('Please paste your tracking link or enter your tracking code.');
      return;
    }

    const token = extractTrackingToken(trimmed);
    if (!token) {
      setError(
        'Invalid tracking format. Please paste the complete tracking URL or the 48-character code shared by your merchant.'
      );
      return;
    }

    // Navigate to the existing secure tracking page
    navigate(`/track/${token}`);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-ink-50">
      <div className="max-w-lg w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-brand-500 text-white flex items-center justify-center mx-auto shadow-subtle mb-3">
            <Package className="w-6 h-6" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold border border-brand-200">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-500" />
            <span>Public Customer Tracking Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-950 tracking-tight">
            Track Your Delivery
          </h1>
          <p className="text-xs sm:text-sm text-ink-600 max-w-md mx-auto">
            Paste the secure tracking link shared by your merchant to view live courier GPS progress and access your 6-digit delivery PIN.
          </p>
        </div>

        {/* Input Card */}
        <Card className="shadow-elevated p-6 sm:p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-ops-danger text-xs rounded-xl flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="trackingInput" className="block text-xs font-semibold text-ink-800">
                  Tracking Link or Token
                </label>
                {navigator.clipboard && (
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-800 transition-colors"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    <span>Paste Link</span>
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  id="trackingInput"
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Paste link (e.g. swiftfleet.vercel.app/track/...)"
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-ink-200 rounded-xl text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-mono shadow-sm"
                  autoFocus
                />
                <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-3" />
              </div>
              <p className="text-[11px] text-ink-500 mt-1.5 leading-normal">
                Example: <span className="font-mono text-ink-700">https://swiftfleet-rosy.vercel.app/track/b8a2...</span> or just the token.
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Track Package
            </Button>
          </form>

          {/* Privacy & Security Callout */}
          <div className="mt-6 pt-5 border-t border-ink-100 space-y-3">
            <div className="flex items-start gap-2.5 text-xs text-ink-600">
              <Lock className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-ink-900 block">No Account Required</span>
                <span className="text-[11px] text-ink-500">
                  SwiftFleet delivery tracking is guest-accessible. You do not need to sign in or create an account to view your package status.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-xs text-ink-600">
              <Truck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-ink-900 block">Secure Handover PIN</span>
                <span className="text-[11px] text-ink-500">
                  Your 6-digit delivery PIN will be displayed on the tracking screen. Share this with your courier in person upon delivery.
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Onboarding Navigation Links for Businesses & Couriers */}
        <div className="text-center text-xs text-ink-500 space-y-2">
          <p>
            Are you a store owner or delivery courier?
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/register-business" className="font-semibold text-brand-600 hover:underline">
              Merchant Business Onboarding
            </Link>
            <span className="text-ink-300">•</span>
            <Link to="/register-partner" className="font-semibold text-emerald-700 hover:underline">
              Courier Partner Application
            </Link>
            <span className="text-ink-300">•</span>
            <Link to="/login" className="font-semibold text-ink-700 hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
