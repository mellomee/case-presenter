import React from 'react';

export default function BucketNav({ buckets, currentBucketId, flatList, currentIndex, onJumpToBucket, onJumpToIndex }) {
  if (buckets.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-xs text-slate-500">No buckets</p>
      </div>
    );
  }

  return (
    <div className="py-3">
      <div className="px-3 mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Buckets</p>
      </div>
      {buckets.map(bucket => {
        const bucketItems = flatList.filter(item => item.bucket.id === bucket.id);
        const firstIndex = flatList.findIndex(item => item.bucket.id === bucket.id);
        const isActive = currentBucketId === bucket.id;

        return (
          <button
            key={bucket.id}
            onClick={() => onJumpToBucket(bucket.id)}
            className={`w-full text-left px-3 py-2.5 transition-colors border-l-2 ${
              isActive
                ? 'border-blue-500 bg-blue-600/10 text-blue-300'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium truncate">{bucket.name}</span>
              <span className="text-xs text-slate-500 ml-2 flex-shrink-0">{bucketItems.length}</span>
            </div>
            {isActive && bucketItems.length > 0 && (
              <div className="flex gap-0.5 mt-1.5">
                {bucketItems.map((item, i) => {
                  const globalIdx = firstIndex + i;
                  return (
                    <button
                      key={item.data.id}
                      onClick={(e) => { e.stopPropagation(); onJumpToIndex(globalIdx); }}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        globalIdx === currentIndex ? 'bg-blue-400' : 'bg-slate-600 hover:bg-slate-500'
                      }`}
                    />
                  );
                })}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}