import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { getFollowing, getFollowers, unfollowUser, followUser } from '../../api/user';
import { getCoverUrl } from '../../utils/media';
import avatarImg from '../../resource/avatar.jpg';

const UserListModal = ({ isOpen, onClose, type, userId, token, onUnfollowSuccess }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !userId) return;

        const fetchUsers = async () => {
            setLoading(true);
            try {
                let data = [];
                if (type === 'following') {
                    data = await getFollowing(token, userId);
                } else if (type === 'followers') {
                    data = await getFollowers(token, userId);
                }
                // Add a local following state for the UI, default to true for 'following', maybe false for 'followers'
                // But in 'followers' we don't know if we follow them back. The user requested "取关" (unfollow), 
                // which mostly applies to the 'following' list. We will just add `isFollowing` true for 'following'.
                const usersWithState = data.map(u => ({ ...u, _isFollowing: type === 'following' }));
                setUsers(usersWithState);
            } catch (err) {
                console.error("Failed to fetch users", err);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [isOpen, type, userId, token]);

    const handleAction = async (targetUser, index) => {
        if (actionLoading) return;
        setActionLoading(true);
        
        const currentlyFollowing = targetUser._isFollowing;
        try {
            if (currentlyFollowing) {
                await unfollowUser(token, targetUser.userId);
                if (type === 'following') {
                    // if viewing own following list and unfollowed, maybe we should notify parent to update count
                    onUnfollowSuccess && onUnfollowSuccess();
                }
            } else {
                await followUser(token, targetUser.userId);
            }
            
            const newUsers = [...users];
            newUsers[index]._isFollowing = !currentlyFollowing;
            setUsers(newUsers);
        } catch (err) {
            alert(err.message || '操作失败');
        } finally {
            setActionLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-slide-in-right">
            <div className="flex items-center justify-between p-4 border-b border-gray-800 relative bg-black z-10">
                <button onClick={onClose} className="text-gray-400 hover:text-white transition absolute left-4 p-2 rounded-full hover:bg-gray-800">
                    <ArrowLeft size={24} />
                </button>
                <h2 className="text-lg font-bold text-white mx-auto">{type === 'following' ? '关注列表' : '粉丝列表'}</h2>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0 bg-black">
                {loading ? (
                    <div className="flex justify-center p-8 text-gray-500">加载中...</div>
                ) : users.length === 0 ? (
                        <div className="flex justify-center p-8 text-gray-500">暂无数据</div>
                    ) : (
                        <div className="space-y-0">
                            {users.map((u, i) => (
                                <div key={u.userId} className="flex items-center justify-between px-4 py-3 hover:bg-gray-900 transition border-b border-gray-800/50">
                                    <div className="flex items-center space-x-4 cursor-pointer">
                                        <div className="w-14 h-14 rounded-full overflow-hidden border border-gray-700 bg-gray-800">
                                            <img src={avatarImg} alt="avatar" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-white text-base">{u.nickname || u.username}</span>
                                            <span className="text-sm text-gray-400 mt-0.5">@{u.username}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleAction(u, i)}
                                        disabled={actionLoading}
                                        className={`px-5 py-1.5 rounded-[4px] text-sm font-medium transition min-w-[80px] ${
                                            u._isFollowing 
                                                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                                                : 'bg-[#fe2c55] text-white hover:bg-[#ef2950]'
                                        }`}
                                    >
                                        {u._isFollowing ? '已关注' : '回关'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
    );
};

export default UserListModal;
