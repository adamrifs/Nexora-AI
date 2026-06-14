import React, { useState, useEffect } from 'react';
import { Search, Loader2, CheckCircle2 } from 'lucide-react';
import googleCalendarIcon from '../../../assets/google-calendar-svgrepo-com.svg';
import gmailIcon from '../../../assets/gmail-svgrepo-com.svg';
import DisconnectPopup from './DisconnectPopup';
import Notification from '../../../components/Notification';
import { baseURL } from '../../../services/api';

const IntegrationList = () => {
  const [loadingApp, setLoadingApp] = useState(null);
  const [connectedApps, setConnectedApps] = useState([]);
  const [popupApp, setPopupApp] = useState(null);
  const [notification, setNotification] = useState({ isVisible: false, message: '', type: 'success' });

  const handleItemClick = (appName) => {
    if (connectedApps.includes(appName)) {
      setPopupApp(appName);
    } else {
      handleConnect(appName);
    }
  };

  const handleDisconnect = async (appName) => {
    try {
      const token = localStorage.getItem('token');
      // Optimistically update the UI to show it's disconnected
      setConnectedApps(prev => prev.filter(app => app !== appName));
      
      const displayName = appName === 'gmail' ? 'Gmail' : appName === 'googlecalendar' ? 'Google Calendar' : appName;
      setNotification({ isVisible: true, message: `${displayName} disconnected successfully`, type: 'success' });

      // If you have a backend endpoint for this, you would call it here:
      // await fetch(`${baseURL}/integrations/disconnect`, { ... })
    } catch (err) {
      console.error('Failed to disconnect', err);
      setNotification({ isVisible: true, message: 'Failed to disconnect', type: 'error' });
    }
  };

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${baseURL}/integrations`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setConnectedApps(data);
        }
      } catch (err) {
        console.error('Failed to fetch connections', err);
      }
    };
    fetchConnections();
  }, []);

  const handleConnect = async (appName) => {
    try {
      setLoadingApp(appName);
      const token = localStorage.getItem('token');
      const res = await fetch(`${baseURL}/integrations/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ appName })
      });

      if (!res.ok) throw new Error('Failed to fetch connection URL');

      const data = await res.json();
      if (data.redirectUrl) {
        const displayName = appName === 'gmail' ? 'Gmail' : appName === 'googlecalendar' ? 'Google Calendar' : appName;
        setNotification({ isVisible: true, message: `Connecting to ${displayName}...`, type: 'info' });
        
        // Brief delay so the user can see the notification before the page redirects
        setTimeout(() => {
          window.location.href = data.redirectUrl;
        }, 1000);
      }
    } catch (error) {
      console.error('Connection error:', error);
      setNotification({ isVisible: true, message: 'Could not initiate connection. Please try again.', type: 'error' });
    } finally {
      setLoadingApp(null);
    }
  };

  return (
    <div>
      <h3 className="text-[#1a1a1a] text-[13px] font-medium tracking-wide mb-3 px-2 uppercase">TOOLS</h3>
      <div className="bg-white/50 backdrop-blur-md rounded-[2rem] py-2 shadow-sm">
        
        <div className="px-2">
          {/* <div className="flex items-center gap-3 py-2 px-3 cursor-pointer hover:bg-white/30 rounded-xl transition-colors border-b border-black/5">
            <div className="w-9 h-9 flex items-center justify-center shrink-0">
              <Search className="w-[22px] h-[22px] text-gray-600" strokeWidth={1.5} />
            </div>
            <p className="text-[#1a1a1a] font-medium text-[15px]">Web Search</p>
          </div> */}
        </div>

        <div className="px-2">
          <div 
            onClick={() => handleItemClick('gmail')}
            className="flex items-center gap-3 py-2 px-3 cursor-pointer hover:bg-white/30 rounded-[2rem] transition-colors border-b border-black/5"
          >
            <div className="w-9 h-9 flex items-center justify-center shrink-0 relative">
              {loadingApp === 'gmail' ? (
                <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
              ) : (
                <img src={gmailIcon} alt="Gmail" className="w-[22px] h-[22px]" />
              )}
            </div>
            <p className="text-[#1a1a1a] font-medium text-[15px] flex-1">{loadingApp === 'gmail' ? 'Connecting...' : 'Gmail'}</p>
            {connectedApps.includes('gmail') && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                Connected
              </span>
            )}
          </div>
        </div>

        <div className="px-2">
          <div 
            onClick={() => handleItemClick('googlecalendar')}
            className="flex items-center gap-3 py-2 px-3 cursor-pointer hover:bg-white/30 rounded-[2rem] transition-colors"
          >
            <div className="w-9 h-9 flex items-center justify-center shrink-0">
              {loadingApp === 'googlecalendar' ? (
                <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
              ) : (
                <img src={googleCalendarIcon} alt="Google Calendar" className="w-[22px] h-[22px]" />
              )}
            </div>
            <p className="text-[#1a1a1a] font-medium text-[15px] flex-1">{loadingApp === 'googlecalendar' ? 'Connecting...' : 'Calendar'}</p>
            {connectedApps.includes('googlecalendar') && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                Connected
              </span>
            )}
          </div>
        </div>

      </div>

      <DisconnectPopup 
        isOpen={!!popupApp} 
        onClose={() => setPopupApp(null)} 
        onDisconnect={handleDisconnect} 
        appName={popupApp} 
      />

      <Notification 
        isVisible={notification.isVisible}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification(prev => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
};

export default IntegrationList;
