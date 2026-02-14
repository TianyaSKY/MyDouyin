import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, User, Plus } from 'lucide-react';

const BottomNavigation = ({ onUpload }) => {
    return (
        <div className="fixed bottom-0 left-0 w-full h-16 bg-black/70 backdrop-blur-xl border-t border-white/10 flex justify-around items-center z-50">
            <NavLink
                to="/"
                className={({ isActive }) =>
                    `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`
                }
            >
                {({ isActive }) => (
                    <>
                        <Home size={24} strokeWidth={isActive ? 3 : 2} />
                        <span className="text-[10px] mt-1">首页</span>
                    </>
                )}
            </NavLink>

            <div
                className="flex flex-col items-center justify-center w-full h-full cursor-pointer"
                onClick={onUpload}
            >
                <div className="w-12 h-8 bg-gradient-to-r from-cyan-400 to-rose-500 rounded-[10px] flex items-center justify-center relative shadow-[0_8px_20px_rgba(0,242,234,0.25)]">
                    <div className="w-11 h-8 bg-white rounded-[9px] flex items-center justify-center absolute left-[2px]">
                        <Plus size={20} className="text-black font-bold" />
                    </div>
                </div>
            </div>

            <NavLink
                to="/me"
                className={({ isActive }) =>
                    `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`
                }
            >
                {({ isActive }) => (
                    <>
                        <User size={24} strokeWidth={isActive ? 3 : 2} />
                        <span className="text-[10px] mt-1">我的</span>
                    </>
                )}
            </NavLink>
        </div>
    );
};

export default BottomNavigation;
