import React from 'react';

const Skeleton = ({ className, ...props }) => {
    return (
        <div
            className={`animate-pulse bg-gray-800 rounded-md ${className}`}
            {...props}
        />
    );
};

export const VideoSkeleton = () => (
    <div className="w-full h-full bg-gray-900 animate-pulse relative">
        <div className="absolute bottom-20 right-2 flex flex-col space-y-4">
            <Skeleton className="w-12 h-12 rounded-full" />
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="w-8 h-8 rounded-full" />
        </div>
        <div className="absolute bottom-4 left-4 w-3/4 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
        </div>
    </div>
);

export const ProfileSkeleton = () => (
    <div className="min-h-screen bg-black pt-14 px-4">
        <div className="flex flex-col items-center">
            <Skeleton className="w-24 h-24 rounded-full mb-4" />
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-20 mb-6" />
        </div>
        <div className="grid grid-cols-3 gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                <Skeleton key={i} className="aspect-[3/4]" />
            ))}
        </div>
    </div>
);

export default Skeleton;
