import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import CompanyDashboard from '../components/dashboard/CompanyDashboard';
import LoadingSpinner from '../components/common/LoadingSpinner';

const DashboardPage = () => {
  const { loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  return <CompanyDashboard />;
};

export default DashboardPage;
