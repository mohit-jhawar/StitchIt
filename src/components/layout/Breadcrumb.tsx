import React from 'react';
import { FiChevronRight, FiHome } from 'react-icons/fi';

interface BreadcrumbProps {
  items: { label: string; href?: string }[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
      <a href="/dashboard" className="hover:text-indigo-600 transition-colors flex items-center">
        <FiHome className="mr-1" />
        Home
      </a>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <FiChevronRight className="text-slate-300 mx-0.5" />
          {item.href ? (
            <a href={item.href} className="hover:text-indigo-600 transition-colors">
              {item.label}
            </a>
          ) : (
            <span className="text-slate-600 font-extrabold">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
