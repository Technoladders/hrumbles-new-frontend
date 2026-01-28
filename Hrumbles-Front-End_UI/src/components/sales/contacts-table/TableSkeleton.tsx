// src/components/sales/contacts-table/TableSkeleton.tsx - REDESIGNED LOADING STATE

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  message?: string;
}

export function TableSkeleton({ rows = 15, columns = 8, message = "Loading contacts..." }: TableSkeletonProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Skeleton Header */}
      <div className="flex items-center gap-0 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 border-b border-slate-600">
        {/* Checkbox column */}
        <div className="w-[40px] flex-shrink-0 px-3 py-3 border-r border-slate-600/30">
          <div className="h-3.5 w-3.5 bg-slate-600 rounded animate-pulse" />
        </div>
        
        {/* Name column */}
        <div className="w-[180px] flex-shrink-0 px-3 py-3 border-r border-slate-600/30">
          <div className="h-3 w-20 bg-slate-600 rounded animate-pulse" />
        </div>
        
        {/* Dynamic columns */}
        {Array.from({ length: columns - 1 }).map((_, i) => (
          <div key={i} className="flex-1 px-3 py-3 border-r border-slate-600/30">
            <div 
              className="h-3 bg-slate-600 rounded animate-pulse" 
              style={{ 
                width: `${50 + Math.random() * 40}%`,
                animationDelay: `${i * 50}ms` 
              }} 
            />
          </div>
        ))}
        
        {/* Actions column */}
        <div className="w-[60px] flex-shrink-0 px-3 py-3">
          <div className="h-3 w-12 bg-slate-600 rounded animate-pulse" />
        </div>
      </div>

      {/* Loading State Overlay */}
      <div className="flex-1 flex items-center justify-center bg-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="inline-block"
          >
            <Loader2 className="h-10 w-10 text-blue-600" />
          </motion.div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">
              {message}
            </p>
            <div className="flex items-center justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-2 w-2 bg-blue-600 rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Alternative: Minimal skeleton with rows
export function TableSkeletonRows({ rows = 15, columns = 8 }: TableSkeletonProps) {
  return (
    <div className="h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-0 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 border-b border-slate-600 sticky top-0 z-10">
        <div className="w-[40px] flex-shrink-0 px-3 py-3 border-r border-slate-600/30">
          <div className="h-3.5 w-3.5 bg-slate-600 rounded animate-pulse" />
        </div>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="flex-1 px-3 py-3 border-r border-slate-600/30 last:border-r-0">
            <div 
              className="h-3 bg-slate-600 rounded animate-pulse" 
              style={{ width: `${60 + Math.random() * 30}%` }} 
            />
          </div>
        ))}
        <div className="w-[60px] flex-shrink-0 px-3 py-3">
          <div className="h-3 w-12 bg-slate-600 rounded animate-pulse" />
        </div>
      </div>

      {/* Rows */}
      <div className="bg-white">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <motion.div
            key={rowIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: rowIndex * 0.02, duration: 0.3 }}
            className="flex items-center gap-0 border-b border-slate-100 hover:bg-slate-50"
          >
            {/* Checkbox */}
            <div className="w-[40px] flex-shrink-0 px-3 py-2 border-r border-slate-100">
              <div className="h-3.5 w-3.5 bg-slate-200 rounded animate-pulse" />
            </div>

            {/* Data cells */}
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="flex-1 px-3 py-2 border-r border-slate-100 last:border-r-0">
                <div 
                  className="h-8 bg-slate-200 rounded animate-pulse" 
                  style={{ 
                    width: `${60 + Math.random() * 35}%`,
                    animationDelay: `${(rowIndex * columns + colIndex) * 10}ms`
                  }} 
                />
              </div>
            ))}

            {/* Actions */}
            <div className="w-[60px] flex-shrink-0 px-3 py-2">
              <div className="h-6 w-6 bg-slate-200 rounded-full animate-pulse mx-auto" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Page-level loader
export function PageLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center space-y-6"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="inline-block"
        >
          <Loader2 className="h-16 w-16 text-blue-600" />
        </motion.div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-800">{message}</h3>
          <div className="flex items-center justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-2.5 w-2.5 bg-blue-600 rounded-full"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.25,
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Sidebar loader
export function SidebarLoader() {
  return (
    <div className="w-[280px] border-r border-slate-200 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-12 bg-slate-200 rounded animate-pulse" />
      </div>
      
      {[1, 2, 3, 4].map((section) => (
        <div key={section} className="space-y-3 pt-4 border-t border-slate-100">
          <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="space-y-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 bg-slate-200 rounded animate-pulse" />
                <div 
                  className="h-3 bg-slate-200 rounded animate-pulse flex-1" 
                  style={{ width: `${60 + Math.random() * 30}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}