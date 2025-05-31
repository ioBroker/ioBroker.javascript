// this file used only for simulation and not used in end build
import React from 'react';
import { createRoot } from 'react-dom/client';
// import App from './App';

window.adapterName = 'adapter-component-template';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
    <React.StrictMode>
        <div />
    </React.StrictMode>,
);
