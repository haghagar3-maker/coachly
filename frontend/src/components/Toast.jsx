import { useState, useEffect, useCallback, useRef } from 'react';

let _show = null;

export function showToast(message, type = 'default') {
  if (_show) _show(message, type);
}

export default function Toast() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState('default');
  const timerRef = useRef(null);

  const show = useCallback((msg, t = 'default') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(msg);
    setType(t);
    setVisible(true);
    timerRef.current = setTimeout(() => {
      setVisible(false);
    }, 3000);
  }, []);

  useEffect(() => {
    _show = show;
    return () => {
      _show = null;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [show]);

  const cls = ['toast', visible ? 'show' : '', type === 'success' ? 'success' : '']
    .filter(Boolean)
    .join(' ');

  return <div className={cls}>{message}</div>;
}
