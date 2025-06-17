import React, { type JSX } from 'react';

const offset = 187;

const styles: Record<string, React.CSSProperties> = {
    root: {
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        position: 'fixed',
        background: 'rgba(0, 0, 0, .3)',
        zIndex: 20000,
    },
    connecting: {
        left: '40%',
        top: '40%',
        width: '20%',
        height: '20%',
        position: 'absolute',
    },
    spinner: {
        animation: 'admin-connecting-rotator 1.4s linear infinite',
    },
    path: {
        strokeDasharray: 187,
        strokeDashoffset: 0,
        transformOrigin: 'center',
        animation: 'admin-connecting-dash 1.4s ease-in-out infinite, $colors 5.6s ease-in-out infinite',
    },
};

function Connecting(): JSX.Element {
    return (
        <div style={styles.root}>
            <style>
                {`
'   @keyframes admin-connecting-colors {
        0% {
            stroke: #4285F4;
        }
        25% {
            stroke: #DE3E35;
        }
        50% {
            stroke: #F7C223;
        }
        75% {
            stroke: #1B9A59;
        }
        100% {
            stroke: #4285F4;
        }
    }
    @keyframes admin-connecting-dash {
        0% {
            stroke-dashoffset: ${offset};
        }
        50% {
            stroke-dashoffset: ${offset / 4};
            transform: rotate(135deg);
        }
        100% {
            stroke-dashoffset: ${offset};
            transform: 'rotate(450deg);
        }
    }
    @keyframes admin-connecting-rotator {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(270deg);
        }
    }
`}
            </style>
            <div style={styles.connecting}>
                <svg
                    style={styles.spinner}
                    width="100%"
                    height="100%"
                    viewBox="0 0 66 66"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <circle
                        style={styles.path}
                        fill="none"
                        strokeWidth="6"
                        strokeLinecap="round"
                        cx="33"
                        cy="33"
                        r="30"
                    />
                </svg>
            </div>
        </div>
    );
}

export default Connecting;
