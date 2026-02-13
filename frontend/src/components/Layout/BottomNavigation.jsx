import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, User, Plus } from 'lucide-react';

const BottomNavigation = ({ onUpload }) => {
    return (
        <div className="fixed bottom-0 left-0 w-full h-14 bg-black border-t border-gray-800 flex justify-around items-center z-50">
            <NavLink
                to="/"
                className={({ isActive }) =>
                    `flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-white' : 'text-gray-500'}`
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
                <div className="w-11 h-7 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-lg flex items-center justify-center relative">
                    <div className="w-10 h-7 bg-white rounded-lg flex items-center justify-center absolute left-[2px]">
                        <Plus size={20} className="text-black font-bold" />
                    </div>
                </div>
            </div>

            <NavLink
                to="/me"
                className={({ isActive }) =>
                    `flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-white' : 'text-gray-500'}`
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
