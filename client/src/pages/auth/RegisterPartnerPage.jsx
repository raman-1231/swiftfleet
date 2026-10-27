import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Bike, ShieldCheck, FileCheck, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const RegisterPartnerPage = () => {
  const { registerPartner } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    vehicleType: 'motorcycle',
    licenseNumber: '',
    idDocumentType: 'Driving Licence',
    idDocumentNumber: ''
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
      name: 'Marcus Vance',
      email: `courier_${Date.now().toString().slice(-4)}@swiftfleet.demo`,
      password: 'Password123!',
      phone: '+91 98765 43210',
      vehicleType: 'motorcycle',
      licenseNumber: 'DL-0420110012345',
      idDocumentType: 'Driving Licence',
      idDocumentNumber: 'DL-0420110012345'
    });
    setFieldErrors({});
    setErrorMessage('');
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    if (!formData.email.trim()) errors.email = 'Valid email is required';
    if (!formData.password || formData.password.length < 8) errors.password = 'Password must be at least 8 characters';

    // India 10-digit mobile phone validation
    const phoneClean = formData.phone.replace(/[\s-]/g, '');
    if (formData.phone && !/^(\+91|0)?[6-9]\d{9}$/.test(phoneClean)) {
      errors.phone = 'Enter a valid 10-digit Indian mobile number (+91 or starting with 6-9)';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage('Please complete all required fields.');
      return;
    }
    setFieldErrors({});
    setErrorMessage('');
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.licenseNumber.trim()) {
      setFieldErrors({ licenseNumber: 'Driver license or ID number is required' });
      setErrorMessage('License number is required for compliance verification.');
      return;
    }
    setErrorMessage('');
    setIsLoading(true);

    try {
      await registerPartner(formData);
      navigate('/partner');
    } catch (err) {
      setErrorMessage(err.message || 'Courier application failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-ink-50">
      <div className="max-w-xl w-full space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-subtle mb-3">
            <Bike className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-ink-950 tracking-tight">Apply as Delivery Partner</h2>
          <p className="text-xs text-ink-500 mt-1">
            Join the verified crowdsourced fleet with guaranteed 78% order payouts
          </p>
        </div>

        {/* Multi-step progress indicator */}
        <div className="flex items-center justify-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${step >= 1 ? 'text-brand-600' : 'text-ink-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 1 ? 'bg-brand-500 text-white' : 'bg-ink-200 text-ink-600'}`}>
              1
            </span>
            <span>Profile & Vehicle</span>
          </div>
          <span className="w-8 h-[1px] bg-ink-200" />
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${step >= 2 ? 'text-brand-600' : 'text-ink-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 2 ? 'bg-brand-500 text-white' : 'bg-ink-200 text-ink-600'}`}>
              2
            </span>
            <span>Identity Verification</span>
          </div>
        </div>

        {/* Demo Quick-Fill Helper (Dev Only) */}
        {enableDemo && (
          <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-emerald-200 shadow-subtle text-xs">
            <span className="text-ink-600 font-medium">Evaluation Demo Mode:</span>
            <button
              type="button"
              onClick={handleFillSample}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline"
            >
              Fill Sample Courier Details
            </button>
          </div>
        )}

        <Card className="shadow-elevated">
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-ops-danger text-xs rounded-lg font-medium">
              {errorMessage}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleNextStep} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-800 mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Marcus Vance"
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
                  <label className="block text-xs font-semibold text-ink-800 mb-1">Mobile Number (+91) *</label>
                  <input
                    type="tel"
                    required
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
                <label className="block text-xs font-semibold text-ink-800 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="marcus@courier.com"
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

              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">Primary Delivery Vehicle</label>
                <select
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="bicycle">Bicycle / Cargo E-Bike</option>
                  <option value="scooter">Electric Scooter</option>
                  <option value="motorcycle">Motorcycle / Moped</option>
                  <option value="car">Sedan / Hatchback Car</option>
                  <option value="van">Cargo Van</option>
                </select>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                size="md"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Proceed to Identity Verification
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Safety Audit Requirement:</strong> All courier profiles enter a <em>Pending Review</em> state. Operations coordinators verify your driver license before active dispatch is enabled.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">Compliance Document Type</label>
                <select
                  name="idDocumentType"
                  value={formData.idDocumentType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Driving Licence">Indian Driving Licence</option>
                  <option value="Aadhaar Card">Aadhaar Card (UIDAI)</option>
                  <option value="PAN Card">PAN Card (Income Tax Dept)</option>
                  <option value="Voter ID">Election Commission Voter ID</option>
                  <option value="Passport">Republic of India Passport</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">Document / Licence Number *</label>
                <input
                  type="text"
                  required
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  placeholder="e.g. DL-0420110012345 or Aadhaar / PAN"
                  className={`w-full px-3 py-2 text-sm bg-white border rounded-lg text-ink-900 focus:outline-none ${
                    fieldErrors.licenseNumber
                      ? 'border-red-400 focus:ring-2 focus:ring-red-400 bg-red-50/20'
                      : 'border-ink-200 focus:ring-2 focus:ring-brand-500'
                  }`}
                />
                {fieldErrors.licenseNumber && (
                  <p className="text-[11px] text-red-600 mt-1">{fieldErrors.licenseNumber}</p>
                )}
              </div>

              <div className="p-4 border-2 border-dashed border-ink-200 rounded-xl bg-ink-50/50 text-center">
                <FileCheck className="w-8 h-8 text-ink-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-ink-800">Identity Document Verification</p>
                <p className="text-[11px] text-ink-500 mt-0.5">
                  Physical or digital KYC documents will be reviewed by SwiftFleet operations before account activation.
                </p>
                <span className="inline-block mt-2 text-[10px] font-mono font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Verification Pending Ops Approval
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="w-1/3"
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="success"
                  className="w-2/3"
                  isLoading={isLoading}
                  disabled={isLoading}
                >
                  Submit Application
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-ink-100 text-center text-xs text-ink-600">
            <span>Already registered as a courier? </span>
            <Link to="/login" className="text-brand-600 font-semibold hover:underline">
              Sign In
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
