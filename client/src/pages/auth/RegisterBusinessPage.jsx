import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Building2, Mail, Lock, Phone, MapPin, Store, ArrowRight, Eye, EyeOff, Bike } from 'lucide-react';

export const RegisterBusinessPage = () => {
  const { registerBusiness } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    companyName: '',
    category: 'restaurant',
    address: '',
    pincode: '',
    gstin: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const enableDemo = !import.meta.env.PROD || import.meta.env.VITE_ENABLE_DEMO === 'true';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (fieldErrors[e.target.name]) {
      setFieldErrors({ ...fieldErrors, [e.target.name]: '' });
    }
  };

  const handleFillSample = () => {
    setFormData({
      name: 'Rohan Sharma',
      email: `merchant_${Date.now().toString().slice(-4)}@artisanroast.in`,
      password: 'Password123!',
      phone: '+91 98765 43210',
      companyName: 'Artisan Roast Cafe',
      category: 'bakery',
      address: 'Shop 14, Inner Circle, Connaught Place, New Delhi',
      pincode: '110001',
      gstin: '07AAAAA0000A1Z5'
    });
    setFieldErrors({});
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.companyName.trim()) errors.companyName = 'Store name is required';
    if (!formData.name.trim()) errors.name = 'Operator name is required';
    if (!formData.address.trim()) errors.address = 'Merchant address is required';
    if (!formData.email.trim()) errors.email = 'Valid email is required';
    if (!formData.password || formData.password.length < 8) errors.password = 'Password must be at least 8 characters';

    // India 10-digit mobile validation
    const phoneClean = formData.phone.replace(/[\s-]/g, '');
    if (formData.phone && !/^(\+91|0)?[6-9]\d{9}$/.test(phoneClean)) {
      errors.phone = 'Enter a valid 10-digit Indian mobile number (+91 or starting with 6-9)';
    }

    // India 6-digit PIN code validation (/^[1-9][0-9]{5}$/)
    if (formData.pincode && !/^[1-9][0-9]{5}$/.test(formData.pincode.trim())) {
      errors.pincode = 'PIN code must be a valid 6-digit Indian postal code starting with 1-9';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage('Please correct the highlighted fields.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      await registerBusiness(formData);
      navigate('/business');
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-ink-50">
      <div className="max-w-xl w-full space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-brand-500 text-white flex items-center justify-center mx-auto shadow-subtle mb-3">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-ink-950 tracking-tight">Register Merchant Business</h2>
          <p className="text-xs text-ink-500 mt-1">
            Access automated dispatch and verified courier workforce on demand
          </p>
        </div>

        {/* Onboarding Flow Selector Tabs */}
        <div className="grid grid-cols-2 p-1 bg-ink-100 rounded-xl border border-ink-200 shadow-sm">
          <div className="py-2 px-3 text-xs font-bold rounded-lg bg-white text-brand-700 shadow-sm flex items-center justify-center gap-1.5 border border-ink-100">
            <Building2 className="w-3.5 h-3.5 text-brand-500" />
            <span>Business Merchant</span>
          </div>
          <Link
            to="/register-partner"
            className="py-2 px-3 text-xs font-semibold rounded-lg text-ink-600 hover:text-ink-950 hover:bg-white/60 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Bike className="w-3.5 h-3.5 text-emerald-600" />
            <span>Courier Partner</span>
          </Link>
        </div>

        {/* Demo Quick-Fill Helper (Dev Only) */}
        {enableDemo && (
          <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-brand-200 shadow-subtle text-xs">
            <span className="text-ink-600 font-medium">Evaluation Demo Mode:</span>
            <button
              type="button"
              onClick={handleFillSample}
              className="text-xs font-semibold text-brand-600 hover:text-brand-800 underline"
            >
              Fill Sample Merchant Data
            </button>
          </div>
        )}

        <Card className="shadow-elevated">
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-ops-danger text-xs rounded-lg font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">Company / Store Name *</label>
                <input
                  type="text"
                  required
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="Artisan Roast Cafe"
                  className={`w-full px-3 py-2 text-sm bg-white border rounded-lg text-ink-900 focus:outline-none ${
                    fieldErrors.companyName
                      ? 'border-red-400 focus:ring-2 focus:ring-red-400 bg-red-50/20'
                      : 'border-ink-200 focus:ring-2 focus:ring-brand-500'
                  }`}
                />
                {fieldErrors.companyName && (
                  <p className="text-[11px] text-red-600 mt-1">{fieldErrors.companyName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">Merchant Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="restaurant">Restaurant / Prepared Food</option>
                  <option value="bakery">Bakery & Cafe</option>
                  <option value="grocery">Grocery & Fresh Produce</option>
                  <option value="pharmacy">Pharmacy & Healthcare</option>
                  <option value="retail">Retail Boutique</option>
                  <option value="e-commerce">E-Commerce Warehouse</option>
                  <option value="other">Other Commercial</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">Operator Name *</label>
                <input
                  type="text"
                  required
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Jane Miller"
                  className={`w-full px-3 py-2 text-sm bg-white border rounded-lg text-ink-900 focus:outline-none ${
                    fieldErrors.name
                      ? 'border-red-400 focus:ring-2 focus:ring-red-400 bg-red-50/20'
                      : 'border-ink-200 focus:ring-2 focus:ring-brand-500'
                  }`}
                />
                {fieldErrors.name && (
                  <p className="text-[11px] text-red-600 mt-1">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">Business Mobile (+91) *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  className={`w-full px-3 py-2 text-sm bg-white border rounded-lg text-ink-900 focus:outline-none ${
                    fieldErrors.phone
                      ? 'border-red-400 focus:ring-2 focus:ring-red-400 bg-red-50/20'
                      : 'border-ink-200 focus:ring-2 focus:ring-brand-500'
                  }`}
                />
                {fieldErrors.phone && (
                  <p className="text-[11px] text-red-600 mt-1">{fieldErrors.phone}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-800 mb-1">Merchant Pickup Address *</label>
              <input
                type="text"
                required
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Shop 14, Inner Circle, Connaught Place, New Delhi"
                className={`w-full px-3 py-2 text-sm bg-white border rounded-lg text-ink-900 focus:outline-none ${
                  fieldErrors.address
                    ? 'border-red-400 focus:ring-2 focus:ring-red-400 bg-red-50/20'
                    : 'border-ink-200 focus:ring-2 focus:ring-brand-500'
                }`}
              />
              {fieldErrors.address && (
                <p className="text-[11px] text-red-600 mt-1">{fieldErrors.address}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">Postal PIN Code *</label>
                <input
                  type="text"
                  name="pincode"
                  maxLength={6}
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="110001"
                  className={`w-full px-3 py-2 text-sm bg-white border rounded-lg text-ink-900 focus:outline-none ${
                    fieldErrors.pincode
                      ? 'border-red-400 focus:ring-2 focus:ring-red-400 bg-red-50/20'
                      : 'border-ink-200 focus:ring-2 focus:ring-brand-500'
                  }`}
                />
                {fieldErrors.pincode && (
                  <p className="text-[11px] text-red-600 mt-1">{fieldErrors.pincode}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  name="gstin"
                  maxLength={15}
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                  placeholder="07AAAAA0000A1Z5"
                  className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="orders@store.com"
                  className={`w-full px-3 py-2 text-sm bg-white border rounded-lg text-ink-900 focus:outline-none ${
                    fieldErrors.email
                      ? 'border-red-400 focus:ring-2 focus:ring-red-400 bg-red-50/20'
                      : 'border-ink-200 focus:ring-2 focus:ring-brand-500'
                  }`}
                />
                {fieldErrors.email && (
                  <p className="text-[11px] text-red-600 mt-1">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min. 8 characters"
                    className={`w-full pl-3 pr-10 py-2 text-sm bg-white border rounded-lg text-ink-900 focus:outline-none ${
                      fieldErrors.password
                        ? 'border-red-400 focus:ring-2 focus:ring-red-400 bg-red-50/20'
                        : 'border-ink-200 focus:ring-2 focus:ring-brand-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-ink-400 hover:text-ink-600"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-[11px] text-red-600 mt-1">{fieldErrors.password}</p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              size="md"
              isLoading={isLoading}
              disabled={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Complete Merchant Registration
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-ink-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-ink-600">
            <div>
              <span>Looking to deliver? </span>
              <Link to="/register-partner" className="text-emerald-700 font-semibold hover:underline">
                Apply as Courier Partner
              </Link>
            </div>
            <div>
              <span>Already registered? </span>
              <Link to="/login" className="text-brand-600 font-semibold hover:underline">
                Sign In
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
