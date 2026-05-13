import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, User, Plus, BarChart3 } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';

const BottomNavigation = ({ onUpload }) => {
    const { user } = useAuthContext();
    const isAdmin = user && user.is_admin === 1;

    return (
        <div className="dy-nav">
            <NavLink
                to="/"
                className={({ isActive }) =>
                    `dy-nav-item ${isActive ? 'dy-nav-item--active' : ''}`
                }
            >
                {({ isActive }) => (
                    <>
                        <Home size={22} strokeWidth={isActive ? 2.8 : 2} />
                        <span className="dy-nav-label">首页</span>
                    </>
                )}
            </NavLink>

            <div
                className="dy-nav-item"
                onClick={onUpload}
            >
                <div className="dy-nav-upload-btn">
                    <Plus size={18} strokeWidth={3} className="text-black" />
                </div>
            </div>

            {isAdmin && (
                <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                        `dy-nav-item ${isActive ? 'dy-nav-item--active' : ''}`
                    }
                >
                    {({ isActive }) => (
                        <>
                            <BarChart3 size={22} strokeWidth={isActive ? 2.8 : 2} />
                            <span className="dy-nav-label">数据</span>
                        </>
                    )}
                </NavLink>
            )}

            <NavLink
                to="/me"
                className={({ isActive }) =>
                    `dy-nav-item ${isActive ? 'dy-nav-item--active' : ''}`
                }
            >
                {({ isActive }) => (
                    <>
                        <User size={22} strokeWidth={isActive ? 2.8 : 2} />
                        <span className="dy-nav-label">我</span>
                    </>
                )}
            </NavLink>
        </div>
    );
};

export default BottomNavigation;
