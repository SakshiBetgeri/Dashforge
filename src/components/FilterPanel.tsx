import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, RotateCcw } from 'lucide-react';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: any[];
  setFilters: (filters: any[]) => void;
  updateFilter: (column: string, updatedFilter: any) => void;
  onReset: () => void;
}

export function FilterPanel({ isOpen, onClose, filters, setFilters, updateFilter, onReset }: FilterPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] lg:hidden"
          />
          <motion.div
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            className="fixed left-0 top-0 h-full w-[260px] bg-[#0F1629] border-r border-white/10 z-[100] p-6 overflow-y-auto no-print shadow-2xl"
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-white font-black uppercase text-xs tracking-widest italic">Data Propulsion</h3>
              <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-8">
              {filters.map(filter => (
                <div key={filter.column} style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    color: '#94a3b8', 
                    fontSize: '12px', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em',
                    fontWeight: '900',
                    display: 'block',
                    marginBottom: '8px'
                  }}>
                    {filter.column}
                  </label>
                  
                  {filter.type === 'categorical' && (
                    <div style={{ marginTop: '8px' }}>
                      {filter.uniqueValues.map((val: string) => (
                        <label key={val} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          padding: '4px 0', 
                          cursor: 'pointer', 
                          color: 'white',
                          fontSize: '12px'
                        }}>
                          <input
                            type="checkbox"
                            checked={filter.selected.includes(val)}
                            onChange={(e) => {
                              const newSelected = e.target.checked
                                ? [...filter.selected, val]
                                : filter.selected.filter((s: string) => s !== val);
                              updateFilter(filter.column, {
                                ...filter, selected: newSelected
                              });
                            }}
                            style={{ accentColor: '#00D9FF' }}
                          />
                          {val}
                        </label>
                      ))}
                    </div>
                  )}

                  {filter.type === 'numeric' && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="number"
                          value={filter.currentMin}
                          onChange={(e) => updateFilter(filter.column, {
                            ...filter, currentMin: Number(e.target.value)
                          })}
                          style={{ 
                            width: '50%', 
                            background: '#1A2235', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px', 
                            padding: '6px', 
                            color: 'white',
                            fontSize: '11px'
                          }}
                          placeholder="Min"
                        />
                        <input
                          type="number"
                          value={filter.currentMax}
                          onChange={(e) => updateFilter(filter.column, {
                            ...filter, currentMax: Number(e.target.value)
                          })}
                          style={{ 
                            width: '50%', 
                            background: '#1A2235',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px', 
                            padding: '6px', 
                            color: 'white',
                            fontSize: '11px'
                          }}
                          placeholder="Max"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={onReset}
              style={{
                width: '100%', 
                padding: '12px',
                background: 'transparent',
                border: '1px solid #EF4444',
                borderRadius: '8px', 
                color: '#EF4444',
                cursor: 'pointer', 
                marginTop: '32px',
                fontSize: '10px',
                fontWeight: '900',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <RotateCcw size={14} />
              Reset All Filters
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
