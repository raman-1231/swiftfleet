import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Lock, Mail, Eye, EyeOff, Truck, ArrowRight, ShieldCheck, Building2, Bike } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const enableDemo = !import.meta.env.PROD || import.meta.env.VITE_ENABLE_DEMO === 'true';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await login(email, password);
      if (res.user.role === 'business') {
        navigate('/business');
      } else if (res.user.role === 'partner') {
        navigate('/partner');
      } else if (res.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-ink-50">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-brand-500 text-white flex items-center justify-center mx-auto shadow-subtle mb-3">
            <Truck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-ink-950 tracking-tight">Sign in to SwiftFleet</h2>
          <p className="text-xs text-ink-500 mt-1">
            Access your merchant operations hub, courier HUD, or admin console
          </p>
        </div>

        {/* Demo Persona Quick-Fill Banner for Evaluator (Dev Only) */}
        {enableDemo && (
          <div className="p-3 bg-white rounded-xl border border-brand-200 shadow-subtle text-xs">
            <p className="font-semibold text-ink-900 mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-500" />
              Portfolio Evaluation Quick-Fill:
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => fillCredentials('roast@artisan.demo')}
                className="px-2 py-1.5 rounded-lg border border-ink-200 bg-ink-50 hover:bg-brand-50 hover:border-brand-300 text-ink-800 text-[11px] font-medium transition-colors text-center"
              >
                Merchant
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('marcus.vance@courier.demo')}
                className="px-2 py-1.5 rounded-lg border border-ink-200 bg-ink-50 hover:bg-brand-50 hover:border-brand-300 text-ink-800 text-[11px] font-medium transition-colors text-center"
              >
                Courier
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('admin@swiftfleet.io')}
                className="px-2 py-1.5 rounded-lg border border-ink-200 bg-ink-50 hover:bg-brand-50 hover:border-brand-300 text-ink-800 text-[11px] font-medium transition-colors text-center"
              >
                Admin Ops
              </button>
            </div>
          </div>
        )}

        <Card className="shadow-elevated">
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-ops-danger text-xs rounded-lg font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-800 mb-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
                <Mail className="w-4 h-4 text-ink-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-ink-800">Password</label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
                <Lock className="w-4 h-4 text-ink-400 absolute left-3 top-2.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-ink-400 hover:text-ink-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              size="md"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-ink-100 text-center text-xs text-ink-600">
            <span>New to SwiftFleet? </span>
            <Link to="/register-business" className="text-brand-600 font-semibold hover:underline">
              Register Business
            </Link>
            <span className="mx-1.5">•</span>
            <Link to="/register-partner" className="text-emerald-700 font-semibold hover:underline">
              Join as Courier
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
