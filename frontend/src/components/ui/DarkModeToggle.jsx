import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function DarkModeToggle() {
    const [isDark, setIsDark] = useState(() => {
        return localStorage.getItem('datpack-theme') === 'dark';
    });

    useEffect(() => {
        const stored = localStorage.getItem('datpack-theme');
        if (stored === 'dark') {
            document.documentElement.classList.add('dark');
            setIsDark(true);
        } else {
            // Explicit light default — saves preference if none exists yet
            if (!stored) localStorage.setItem('datpack-theme', 'light');
            document.documentElement.classList.remove('dark');
            setIsDark(false);
        }
    }, []);

    const toggle = () => {
        if (isDark) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('datpack-theme', 'light');
            setIsDark(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('datpack-theme', 'dark');
            setIsDark(true);
        }
    };

    return (
        <button
            onClick={toggle}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
                position: 'relative',
                width: '52px',
                height: '28px',
                borderRadius: '14px',
                border: isDark
                    ? '1px solid rgba(200,149,108,0.5)'
                    : '1px solid rgba(200,149,108,0.3)',
                background: isDark
                    ? 'rgba(200,149,108,0.25)'
                    : 'rgba(200,149,108,0.15)',
                cursor: 'pointer',
                transition: 'all 300ms ease',
                flexShrink: 0,
                padding: 0,
            }}
        >
            <span
                style={{
                    position: 'absolute',
                    top: '3px',
                    left: isDark ? '25px' : '3px',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#C8956C',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'left 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    boxShadow: '0 2px 8px rgba(200,149,108,0.4)',
                    color: isDark ? '#C8956C' : '#92400E',
                }}
            >
                {isDark
                    ? <Moon size={13} color="#fff8f0" />
                    : <Sun size={13} color="#fff8f0" />
                }
            </span>
        </button>
    );
}

