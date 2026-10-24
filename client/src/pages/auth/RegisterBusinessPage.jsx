import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Building2, Mail, Lock, Phone, MapPin, Store, ArrowRight } from 'lucide-react';

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
    address: '350 5th Ave, New York, NY 10118'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

        <Card className="shadow-elevated">
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-ops-danger text-xs rounded-lg font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">Company / Store Name</label>
                <input
                  type="text"
                  required
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="Artisan Roast Cafe"
                  className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
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
                <label className="block text-xs font-semibold text-ink-800 mb-1">Operator Name</label>
                <input
                  type="text"
                  required
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Jane Miller"
                  className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">Business Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 012-3456"
                  className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-800 mb-1">Merchant Pickup Address</label>
              <input
                type="text"
                required
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="240 Central Park South, New York, NY"
                className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="orders@store.com"
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
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              size="md"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Complete Merchant Registration
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-ink-100 text-center text-xs text-ink-600">
            <span>Already have an account? </span>
            <Link to="/login" className="text-brand-600 font-semibold hover:underline">
              Sign In
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
