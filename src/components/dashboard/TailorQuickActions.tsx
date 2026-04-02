import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { MeasurementForm } from '../measurements/MeasurementForm';
import { AppointmentForm } from '../appointments/AppointmentForm';
import { OrderForm } from '../orders/OrderForm';
import { FiPlus, FiCalendar, FiScissors, FiClipboard } from 'react-icons/fi';

interface TailorQuickActionsProps {
  tailorId: string;
}

export function TailorQuickActions({ tailorId }: TailorQuickActionsProps) {
  const [activeModal, setActiveModal] = useState<'MEASUREMENT' | 'APPOINTMENT' | 'ORDER' | null>(null);

  const closeModal = () => setActiveModal(null);

  const actions = [
    { 
      id: 'ORDER', 
      label: 'New Order', 
      icon: FiClipboard, 
      color: 'bg-indigo-600 hover:bg-indigo-700',
      description: 'Create a new stitching order' 
    },
    { 
      id: 'MEASUREMENT', 
      label: 'Add Measurement', 
      icon: FiScissors, 
      color: 'bg-purple-600 hover:bg-purple-700',
      description: 'Record customer measurements' 
    },
    { 
      id: 'APPOINTMENT', 
      label: 'Book Appointment', 
      icon: FiCalendar, 
      color: 'bg-blue-600 hover:bg-blue-700',
      description: 'Schedule a fitting or trial' 
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => setActiveModal(action.id as any)}
          className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group text-left w-full"
        >
          <div className={`w-12 h-12 ${action.color} text-white rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform`}>
            <action.icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">{action.label}</p>
            <p className="text-[10px] text-gray-500 mt-1">{action.description}</p>
          </div>
        </button>
      ))}

      {/* Modals */}
      <Modal 
        isOpen={activeModal === 'MEASUREMENT'} 
        onClose={closeModal} 
        title="Record Measurement" 
        size="lg"
      >
        <MeasurementForm role="TAILOR" onSuccess={closeModal} />
      </Modal>

      <Modal 
        isOpen={activeModal === 'APPOINTMENT'} 
        onClose={closeModal} 
        title="Schedule Appointment" 
        size="md"
      >
        <AppointmentForm role="TAILOR" defaultTailorId={tailorId} onSuccess={closeModal} />
      </Modal>

      <Modal 
        isOpen={activeModal === 'ORDER'} 
        onClose={closeModal} 
        title="Create New Order" 
        size="xl"
      >
        <OrderForm role="TAILOR" onSuccess={closeModal} />
      </Modal>
    </div>
  );
}

export default TailorQuickActions;
