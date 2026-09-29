import { useEffect, useRef } from 'react';

export function useModalA11y(isOpen, onClose) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const modal = modalRef.current;
    const focusable = () => [...modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((element) => !element.disabled);
    focusable()[0]?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    modal?.addEventListener('keydown', handleKeyDown);
    return () => modal?.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return modalRef;
}
