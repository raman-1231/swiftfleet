import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Bike, ShieldCheck, FileCheck, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

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
    idDocumentType: 'Driver License',
    idDocumentNumber: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      setErrorMessage('Please fill in all personal details.');
      return;
    }
    setErrorMessage('');
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
                  <label className="block text-xs font-semibold text-ink-800 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Marcus Vance"
                    className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-800 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    required
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 789-0123"
                    className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="marcus@courier.com"
                  className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">Password</label>
                <input
                  type="password"
                  required
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min. 8 characters"
                  className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
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
                <label className="block text-xs font-semibold text-ink-800 mb-1">Document Type</label>
                <select
                  name="idDocumentType"
                  value={formData.idDocumentType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Driver License">State Driver License</option>
                  <option value="National ID">Government ID Card</option>
                  <option value="Passport">Passport</option>
                  <option value="Work Permit">Commercial Work Permit</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">Driver License / ID Number</label>
                <input
                  type="text"
                  required
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  placeholder="e.g. NY-DL-8823194"
                  className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="p-4 border-2 border-dashed border-ink-200 rounded-xl bg-ink-50/50 text-center">
                <FileCheck className="w-8 h-8 text-ink-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-ink-800">Identity Document Scan (Simulated Attachment)</p>
                <p className="text-[11px] text-ink-500 mt-0.5">
                  Securely stored for operations officer inspection. Demo environment auto-generates audit document token.
                </p>
                <span className="inline-block mt-2 text-[10px] font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Document Checksum Ready
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="w-1/3"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="success"
                  className="w-2/3"
                  isLoading={isLoading}
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
