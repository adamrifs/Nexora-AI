import React from 'react';
import SidebarHeader from './components/SidebarHeader';
import NewChatButton from './components/NewChatButton';
import RecentChatList from './components/RecentChatList';
import RecentDocumentsList from './components/RecentDocumentsList';
import IntegrationList from './components/IntegrationList';
import ProfileFooter from './components/ProfileFooter';
import { Plus, Search, MessageSquare, Settings } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const getInitials = (name) => {
  const cleanName = name || 'Alex';
  const parts = cleanName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const PanelLeftClose = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M9 3v18" />
    <path d="m16 15-3-3 3-3" />
  </svg>
);

const PanelLeftOpen = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M9 3v18" />
    <path d="m14 9 3 3-3 3" />
  </svg>
);

const Sidebar = ({ currentChatId, onSelectChat, refreshTrigger, isOpen, onClose, isCollapsed, onToggleCollapse }) => {
  const { user } = useAuth();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden transition-opacity" 
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-50 h-full flex flex-col shrink-0 bg-[#F3F0FF] md:bg-transparent shadow-2xl md:shadow-none
        transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'md:w-[72px] md:mr-0' : 'md:w-[330px] md:mr-4'}
        md:relative md:flex md:translate-x-0
      `}>
        {/* Toggle Button for collapsing sidebar - aligns exactly with header and centers in mini sidebar when collapsed */}
        <button 
          onClick={onToggleCollapse}
          className={`hidden md:flex absolute top-[26px] z-[60] w-10 h-10 rounded-full bg-white/70 hover:bg-white/90 items-center justify-center transition-all duration-300 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-white/50 text-gray-600 hover:text-[#8C52FF] ${isCollapsed ? 'left-[16px]' : 'right-4'}`}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-[18px] h-[18px]" />
          ) : (
            <PanelLeftClose className="w-[18px] h-[18px]" />
          )}
        </button>

        {/* Mini Sidebar Content (Fades in when collapsed) */}
        <div className={`hidden md:flex absolute inset-y-0 left-0 w-[72px] flex-col items-center pt-24 pb-6 transition-opacity duration-300 ease-in-out z-[40] ${isCollapsed ? 'opacity-100 pointer-events-auto delay-100' : 'opacity-0 pointer-events-none'}`}>
          <button 
            onClick={() => { onSelectChat(null); onToggleCollapse(); }}
            className="w-10 h-10 rounded-full hover:bg-white/70 flex items-center justify-center transition-colors text-gray-600 mt-2 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-white/50"
            title="New Chat"
          >
            <Plus className="w-[20px] h-[20px]" />
          </button>
          
          <button 
            onClick={onToggleCollapse}
            className="w-10 h-10 rounded-full hover:bg-white/70 flex items-center justify-center transition-colors text-gray-500 mt-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-white/50"
            title="Search"
          >
            <Search className="w-[18px] h-[18px]" strokeWidth={1.8} />
          </button>
          
          <div className="flex-1" />
          
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-tr from-[#BE8AEE] to-[#8E6FD6] text-white font-semibold text-[14px] shadow-sm cursor-pointer hover:opacity-90 transition-opacity overflow-hidden">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              getInitials(user?.name)
            )}
          </div>
        </div>
      
        {/* Fixed Width Wrapper to prevent squishing during collapse */}
        <div className={`w-[330px] h-full flex flex-col shrink-0 relative transition-all duration-300 ease-in-out ${isCollapsed ? 'md:-translate-x-full md:opacity-0 pointer-events-none' : 'md:translate-x-0 md:opacity-100 pointer-events-auto delay-100'}`}>
          {/* Scrollable Area */}
          <div className="flex-1 overflow-y-auto pt-6 px-4 pb-28">
            <SidebarHeader />
            
            <div className="mt-6">
              <NewChatButton onSelectChat={onSelectChat} />
            </div>

            <div className="mt-6 flex flex-col gap-6">
              <RecentChatList
                currentChatId={currentChatId}
                onSelectChat={onSelectChat}
                refreshTrigger={refreshTrigger}
              />
              <RecentDocumentsList refreshTrigger={refreshTrigger} />
              <IntegrationList />
            </div>
          </div>

          {/* Fixed Profile Footer at the bottom */}
          <div className="absolute bottom-0 left-0 w-full z-10">
            <ProfileFooter />
          </div>
        </div>

    </div>
    </>
  );
};

export default Sidebar;
