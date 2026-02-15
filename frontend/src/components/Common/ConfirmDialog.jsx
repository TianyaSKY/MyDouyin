import React, { useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

const ConfirmDialog = ({
    isOpen,
    onClose,
    onConfirm,
    title = '提示',
    message = '确定要执行此操作吗？',
    confirmText = '确定',
    cancelText = '取消',
    isDangerous = false
}) => {

    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className="bg-[#161823] w-full max-w-sm rounded-lg shadow-2xl border border-gray-800 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                    <h3 className="text-white font-bold text-lg flex items-center">
                        <AlertCircle size={20} className={`mr-2 ${isDangerous ? 'text-[#FE2C55]' : 'text-blue-500'}`} />
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-gray-300 text-sm leading-relaxed">
                        {message}
                    </p>
                </div>

                {/* Footer */}
                <div className="flex space-x-3 px-5 py-4 bg-[#1f212d] border-t border-gray-800">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 rounded-sm text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors border border-gray-600"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 py-2 rounded-sm text-sm font-medium text-white transition-colors shadow-md ${isDangerous
                                ? 'bg-[#FE2C55] hover:bg-[#E6284D]'
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
