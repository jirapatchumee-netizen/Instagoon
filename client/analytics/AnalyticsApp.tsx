import React, { useState, useEffect, useCallback } from 'react';
import type { AuthState } from './types';
import { AdminDashboard } from './AdminDashboard';
import { CreatorDashboard } from './CreatorDashboard';
import { AccessDenied } from './AccessDenied';
import { RefreshCw } from 'lucide-react';

export function AnalyticsApp() {
  const [hours, setHours] = useState<number>(24);
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const loadData = useCallback(async (h = hours) => {
    setState({ status: 'loading' });
    try {
      // 1. First probe Admin Overview
      const adminRes = await fetch(`/api/analytics/overview?hours=${h}`);
      if (adminRes.status === 200) {
        const data = await adminRes.json();
        setState({ status: 'admin', data });
        return;
      }

      if (adminRes.status === 401) {
        setState({ status: 'unauthorized' });
        return;
      }

      if (adminRes.status === 503) {
        setState({ status: 'disabled' });
        return;
      }

      // 2. If 403 (or not admin), probe Creator View
      if (adminRes.status === 403) {
        const creatorRes = await fetch(`/api/analytics/me?hours=${h}`);
        if (creatorRes.status === 200) {
          const data = await creatorRes.json();
          setState({ status: 'creator', data });
          return;
        }

        if (creatorRes.status === 403) {
          // Both admin and creator returned 403 -> plain player
          setState({ status: 'player' });
          return;
        }

        if (creatorRes.status === 401) {
          setState({ status: 'unauthorized' });
          return;
        }
      }

      setState({ status: 'error', message: `Server returned unexpected status: ${adminRes.status}` });
    } catch (err: any) {
      setState({ status: 'error', message: err.message || 'Cannot connect to analytics plane' });
    }
  }, [hours]);

  useEffect(() => {
    loadData(hours);
  }, [hours, loadData]);

  const handleHoursChange = (newHours: number) => {
    setHours(newHours);
    loadData(newHours);
  };

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-zinc-950 text-zinc-100">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 shadow-xl">
          <RefreshCw className="w-6 h-6 text-pink-500 animate-spin" />
        </div>
        <p className="text-sm font-medium text-zinc-400">กำลังเชื่อมต่อฐานข้อมูล Analytics...</p>
      </div>
    );
  }

  if (state.status === 'admin') {
    return (
      <AdminDashboard 
        data={state.data} 
        hours={hours} 
        onHoursChange={handleHoursChange} 
        onRefresh={() => loadData(hours)} 
      />
    );
  }

  if (state.status === 'creator') {
    return (
      <CreatorDashboard 
        data={state.data} 
        hours={hours} 
        onHoursChange={handleHoursChange} 
        onRefresh={() => loadData(hours)} 
      />
    );
  }

  if (state.status === 'unauthorized') {
    return <AccessDenied type="401" onRetry={() => loadData(hours)} />;
  }

  if (state.status === 'player') {
    return <AccessDenied type="403" onRetry={() => loadData(hours)} />;
  }

  if (state.status === 'disabled') {
    return <AccessDenied type="503" onRetry={() => loadData(hours)} />;
  }

  return <AccessDenied type="error" message={state.message} onRetry={() => loadData(hours)} />;
}
