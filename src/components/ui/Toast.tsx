import React from 'react';
import { Toaster, toast } from 'sonner';

export function Toast() {
  return (
    <Toaster
      position="top-right"
      richColors
      toastOptions={{
        style: {
          fontSize: '14px',
          borderRadius: '10px',
        },
      }}
    />
  );
}

export { toast };
export default Toast;
